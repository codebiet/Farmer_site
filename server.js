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
const multer = require("multer");

//middleware import
const auth = require("./middleware/auth");
const back_control = require("./middleware/back_control");

//set template engine
app.set("view engine",'ejs');

app.use(flash());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());




//database connection
mongoose.connect(process.env.MONGO_CONNECTION_URL,{useNewUrlParser:true,useFindAndModify:false, useCreateIndex:true, useUnifiedTopology:true, useFindAndModify:true});
const connection = mongoose.connection;
connection.once('open',() => {
    console.log("Database connected....");
}).catch(err => {
    console.log('Connected failed....');
});

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
    }
},{timestamps:true});
//create model for UserSchema
const User=mongoose.model("User",userSchema);

const profileSchema=new mongoose.Schema({
    customerId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    profileimage:{
        type:String,
        required:true,  
    },
    fname:{
        type:String,
        required:true
    },
    lname:{
        type:String,
        required:true
    },
    category:{
        type:String,
        required:true
    },
    phone:{
        type:Number,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    state:{
        type:String,
        required:true
    },
    district:{
        type:String,
        required:true
    },
    village:{
        type:String,
        required:true
    },
    pincode:{
        type:Number,
        required:true
    }

},{timestamps:true});
//create model for profileSchema
const Profile=mongoose.model("Profile",profileSchema);

//createing  post schma
const postSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    crop:{
        type:String,
        required:true
    },
    cropquantity:{
        type:Number,
        required:true
    },
    district:{
        type:String,
        required:true
    },
   massage:{
        type:String,
        required:true
   },
   pincode:{
        type:Number,
        required:true
    }
},{timestamps:true});
//create model for postSchema
const Post=mongoose.model("Post",postSchema);

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
          return done(null,false,{message:'Wrong email or password'})
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


// set storage engine for multer 
const storage = multer.diskStorage({
    destination:'./public/uploads/',
    filename : function(req, file ,cb){
        cb(null,file.fieldname +"-"+ Date.now() + path.extname(file.originalname));
        }
});

const upload = multer({ 
    storage : storage,
    limits:{fileSize:2000000},
    fileFilter:function(req,file,cb){
       checkFileType(file,cb);
    }
  }).single("profileimage");

//   check fileType
function checkFileType(file,cb){
    // allow extension
    const filetypes=/jpeg|jpg|png|gif/;
    // check extension
    const extname=filetypes.test(path.extname(file.originalname).toLowerCase());
    // check mimetype
    const mimetype=filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null,true);
    }else{
        cb('Error : Images only!')
    }
}



//routes

app.get("/",(req,res) => {
  res.render("home")
});

app.get("/home2",auth,(req,res) => {
    res.render("home2")
  });

app.get("/contact",(req,res) => {
    res.render("contact")
  });

app.get("/about",(req,res) => {
    res.render("about")
  });

app.get("/login",back_control,(req,res) => {
    res.render("login")
  });

app.get("/register",back_control,(req,res) => {
    res.render("register")
  });


app.get("/profile",auth,(req,res) => {

    // console.log(req.user._id)
    Profile.find({customerId:req.user._id}, (err,foundprofile) => {
    // console.log(foundprofile[0]);
    res.render("profile",{profile:foundprofile[0]})

});

// Post.find({customerId:req.user._id}, (err,foundpost) => {
     
//     // console.log(foundprofile[0]);
//     res.render("profile",{post:foundpost[0]})
// });

});

app.get("/editprofile",auth,(req,res) => {
    res.render("editprofile")
  });


// app.get("/create_post",(req,res) => {
//     res.render("create_post")
//   });


// app.get("/updatepassword",(req,res) => {
//     res.render("updatepassword")
//   });


app.post("/register",(req,res) => {
    const {username,email,password,phone} = req.body
            //validate request
            if(!username || !email || !password || !phone){
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
   
            //hashing
            const hashpassword= bcrypt.hashSync(password,10);
            
            //create a user
            const user = new User({
               username:username,
               email:email,
               password:hashpassword,
               phone:phone
            });
            
            user.save().then((user) =>{
                res.render('home2')
            }).catch((err) => {
                req.flash('error','Something went wrong')//ek hi bar request krne ke liye hota hai
                res.redirect("/register")
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
          return  res.redirect("/home2")
        })

     })(req,res,next);
});

app.post("/logout",(req,res) => {
        req.logout()
        return res.redirect('/');
});

app.post("/editprofile",auth,upload,(req,res) => {
    // console.log(req.file)
    const {fname,lname,category,phone,email,state,district,village,pincode} = req.body;

    const profile = new Profile({
        customerId:req.user._id,
        profileimage:req.file.filename,
        fname,
        lname,
        category,
        phone,
        email,
        state,
        district,
        village,
        pincode
    });
    profile.save().then((profile) =>{
        // console.log(profile);
        return res.redirect('/profile')
    }).catch((err) => {
        return res.redirect("/login")
    });

    // profile.save(result,function(err){
    //     if(err){
    //         console.log(err)
    //     }else{
    //     console.log(result)
    //     // res.render("/profile",{profile:profile});
    //     }
    // });

    // res.render("profile")

  });

app.post("/updatepassword",auth,(req,res) => {

const {currentpassword,newpassword} = req.body;

if(bcrypt.compareSync(currentpassword,req.user.password)){

    //hashing
    const hashpassword= bcrypt.hashSync(newpassword[0],10);
        User.findByIdAndUpdate(req.user._id,{password:hashpassword},(err,result) => {
              if(err){
                  console.log(err)
              }else{
                //   console.log(result)
                res.redirect("/profile");
              }
        });
}
// console.log(req.user.password);
// res.redirect("/profile");
});




app.post("/create_post",auth,(req,res) => {
    const {username,crop,cropquantity,massage,district,pincode} = req.body;

    const post = new Post({
        username,
        crop,
        cropquantity,
        massage,
        district,
        pincode
    });
    post.save().then((post) => {
        //  console.log(post);
        return res.redirect('/profile')
    }).catch((err) => {
        console.log(err);
    });
});



app.listen(1000,() => {
    console.log("server is listen at port 1000 ")
});