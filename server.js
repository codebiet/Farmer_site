require("dotenv").config();
const express = require("express");
const app=express()

const path = require("path");
const ejs = require("ejs");
// const expressLayout = require("express-ejs-layouts");
const bodyParser = require("body-parser");
const flash = require("express-flash");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy
const bcrypt = require("bcrypt");
const session = require("express-session");
const MongoDbStore = require("connect-mongo")(session);

app.use(flash());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

//set template engine
app.set("view engine",'ejs');


//database connection
mongoose.connect(process.env.MONGO_CONNECTION_URL,{useNewUrlParser:true, useCreateIndex:true, useUnifiedTopology:true, useFindAndModify:true});
const connection = mongoose.connection;
connection.once('open',() => {
    console.log("Database connected....");
}).catch(err => {
    console.log('Connected failed....');
});

//session store
let mongoStore = new MongoDbStore({
    mongooseConnection:connection,
    collection:'sessions'
});

//session config
app.use(session({
    secret: process.env.COOKIE_SECRET,
    resave:false,
    store:mongoStore,//nhi to by default memory mai store kr dega isliye db mai store krne ke liye mongostore banana pda
    saveUninitialized:false,
    cookie:{maxAge:1000*60*60*24} //24 hours
}))

//schemas
const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    phone:{
        type:Number,
        required:true
    },

    role:{
        type:String,
        required:true
    }
},{timestamps:true});
//create model for UserSchema
const User=mongoose.model("User",userSchema);


// passport config
passport.use(new LocalStrategy({usernameField:'email'}, async (email,password,done) => 
   {
       //check if email exist
       const user = await User.findOne({email : email})
       if(!user){
          return done(null,false,{message:'No user with this mail'})
       }
        
       bcrypt.compare(password,user.password).then(match => {
           if(match){
              return done(null,user,{message:'Logged in succesfully'})
           }
          return done(null,false,{message:'Wrong username or password'})
       }).catch((err) => {

          return  done(null,false,{message:'Something went wrong'})

       })
        
   }))
passport.serializeUser((user,done)=>{
       done(null,user._id)
});
passport.deserializeUser((id,done) => {
    User.findById(id,(err,user) => {
        done(err,user)
    })
});

app.use(passport.initialize());
app.use(passport.session());






app.get("/",(req,res) => {
  res.render("home")
});

app.get("/login",(req,res) => {
    res.render("login")
  });

app.get("/register",(req,res) => {
    res.render("register")
  });

app.post("/register",(req,res) => {
    const {username,email,password,phone,role} = req.body
            //validate request
            if(!username || !email || !password || !phone || !role){
                req.flash('error','All fields are required')//ek hi bar request krne ke liye hota hai
                // req.flash('name',name)
                // req.flash('email',email)
              res.redirect("/register")
            }
            //check if email exist
            User.exists({email:email},(err,result) => {
                  if(result){
                    req.flash('error','Email already register')//ek hi bar request krne ke liye hota hai
                    // req.flash('name',name)
                    // req.flash('email',email)
                   res.redirect("/register")
                   }
            });
   
            //hash
            const hashpassword= bcrypt.hashSync(password,10);
            
            //create a user
            const user = new User({
               username:username,
               email:email,
               password:hashpassword,
               phone:phone,
               role:role
            });
            
            user.save().then((user) =>{
                res.redirect('/')
            }).catch((err) => {
                req.flash('error','Something went wrong')//ek hi bar request krne ke liye hota hai
                res.redirect("/")
            });

  });
  
app.post("/login",(req,res,next) => {
    passport.authenticate('local',(err,user,info) => {
    
        if(err){
            req.flash('error',info.message)
            return next(err)
        }
        if(!user){
          req.flash('error',info.message)
           return res.redirect('/login')
        }

        req.logIn(user,(err)=> {
          if(err){
              req.flash('error',info.message)
            return  next(err)
          }
           res.redirect("/")
        })

     })(req,res,next);
});


app.get("/contact",(req,res) => {
    res.render("contact")
  });



app.listen(1000,() => {
    console.log("server is listen at port 1000 ")
})