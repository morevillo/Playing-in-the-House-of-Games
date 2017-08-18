var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var path = require('path');
//var cors = require('cors');

//Passport
var passport = require('passport');
var flash    = require('connect-flash');
var LocalStrategy   = require('passport-local').Strategy;

//Session
var session = require('express-session');
app.use(session({
	secret: 'houseofgamessecret',
	saveUninitialized: true,
	resave: true,
	cookie: {
		path: '/',
		httpOnly: false,
		maxAge: 900000 //15 minute Timeout
	}
}));

// app.use(function(req, res, next) {
// 	if(req.headers.origin){
// 		res.header("Access-Control-Allow-Origin", "*");
// 	  	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
// 	  	res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");	
//   		if(req.method==='OPTIONS'){return res.send(200)}
// 	}
	
//   	next();
// });

// app.use(cors());
//app.options('*', cors());

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next){
    if(req.user){
    	console.log("USERNAME JSON: " + JSON.stringify(req.user));
        res.locals.username = req.user.username;
        res.locals.isLoggedIn = true;
    } else {
        res.locals.username = "None";
        res.locals.isLoggedIn = false;
    }
    next();
});

app.use

//================Database Setup====================//
var pg = require('pg');

const Pool = require('pg-pool');
const url = require('url')
const connectionString = "postgres://nldtjebakdcwid:fd27e6eeeaa90bc9f691d2692d4d1c5632005215ba880f58fa5d0944bdbc428f@ec2-23-21-220-188.compute-1.amazonaws.com:5432/df6jlcpaevc1fe";
const params = url.parse(process.env.DATABASE_URL || connectionString);
const auth = params.auth.split(':');
 
const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1],
  ssl: true
};
 
const pool = new Pool(config);

//====================Middleware========================//
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(bodyParser.json());
var methodOverride = require('method-override');

// app.set('views', __dirname + '/public/views');
app.set('views', __dirname);
app.set('view engine', 'ejs');
// app.engine('html', require('ejs').renderFile);

app.use('/scripts', express.static(__dirname + '/node_modules/bootstrap/dist/'));
// app.use('/css', express.static(__dirname + '/public/css'));

app.use('/public', express.static(__dirname + '/public'));

//=============Passport Session Setup=================//
passport.serializeUser(function(user, done) {
	console.log("USER: " + user)
    done(null, user);
});
passport.deserializeUser(function(user, done) {
	done(null, user);
});

//Passport Login
passport.use('local-login', new LocalStrategy({
	usernameField: 'username',
	passwordField: 'password',
	passReqToCallback : true
}, function(req, username, password, done){
	console.log("Entering login strategy");
	pool.query("SELECT * FROM users WHERE username = $1", [username], function(err, result){
		console.log("Querying for login " + result);
		if(err){
			console.log("Unsuccessfull Login :(");
			return done(err);
		}
		//Check if username exists
		if(!result.rows.length){
			console.log("Wrong username");
            return done(null, false, req.flash('loginMessage', 'Incorrect username/password'));
        }
        //Check password, TODO: use brcypt
        if(password!=result.rows[0].password){
        	console.log("Wrong password");
        	return done(null, false, req.flash('loginMessage', 'Incorrect username/password'));
        }
		else{
			//Successful login
			return done(null, result.rows[0]);
		}
	});
	//Query for login will be here
	//var user = client.query("SELECT * FROM [] WHERE username = '" + username + "';", callback);
	//brcypt stuff Callback function

}));

//Passport Register/Signup
passport.use('local-signup', new LocalStrategy({
	usernameField : 'username',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
}, function(req, username, password, done){
	process.nextTick(function(){
		//DO queries here?
		console.log("Querying now...");
		pool.query("SELECT * FROM users where username = $1", [req.body.username], function(err, result){
			// console.log("Querying now...");
				if(err){
					//client.release();
					return done(err);
				}else{
					if(result.rows[0] != undefined){
						// already exists
						console.log("Already exists");
						return done(null, false, req.flash('signupMessage', 'That username is already taken. Please enter a new one'));						
					} else {
						var user = {
							username: username,
							password: password
						};

						console.log("Doesn't exist");
						var values = [req.body.fname, req.body.lname, username, req.body.email, req.body.gender, req.body.age, req.body.ethnicity, req.body.password];
						pool.query("INSERT INTO users (fname, lname, username, email, gender, age, ethnicity, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);", values, function(err, result){
							//client.release();
							if(err){
								return done(err);
							}else{
								console.log("SUCESSFULLY ADDED USER!!");
								
								return done(null, user);
							}
						});
					}
				}
			});
	});
}));

//===================ROUTES===========================//

app.get('/', function(req, res) {
    //res.sendFile(path.join(__dirname + '/public/index.html'));
    // res.render('index.html');
    res.render('pages/home');
});

app.get('/register', function(req, res){
	//res.setHeader('Cache-Control', 'public, max-age= 3600');
	res.render('pages/register', { message: req.flash('signupMessage') });
});

app.post('/register/auth', passport.authenticate('local-signup', {
        successRedirect : '/pregame', // redirect to pregame questionnaire if success
        failureRedirect : '/register', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
}));

app.get('/disclaimer',function(req, res){
	res.render('pages/disclaimer');
});

app.get('/pregame', isLoggedIn, function(req, res){
	res.render('pages/pregame', {
		message: req.flash('loginMessage')
	});
});

app.post('/pregame/auth', function(req, res){
	var values = [req.user.username, req.body.privacy_val, req.body.social_media, req.body.freq, req.body.fb_val];

	pool.query("INSERT INTO pregame (username, priv_val, social_media, freq, tnc) VALUES ($1, $2, $3, $4, $5);", values, function(err, result){
		if(err){
			console.log("Error inserting items to database in pregame questionnaire");
			console.log(err);
			console.log("END");
			return;
		}
	});

	res.send({redirect: '/gameinfo'});
});

app.get('/gameinfo', function(req, res){
	res.render('pages/gameinfo');
});

app.get('/game', function(req, res){
	res.render('pages/game');
});

app.post('/game/auth', function(req, res){
	var values = [req.user.username, req.body.round1money, req.body.round1status];

	pool.query("INSERT INTO game1 (username, round1money, round1status) VALUES ($1, $2, $3);", values, function(err, result){
		if(err){
			console.log("Error inserting items to database in game results");
			console.log(err);
			console.log("END");
			return;
		}
	});

	console.log("SUCCESSFULLY ADDED ROW INTO GAME1 TABLE: " + req.user.username + " money: " + req.body.round1money + " stat: " +round1status);
});

app.get('/round2', function(req, res){
	res.render('pages/round2');
});

app.post('/round2/auth', function(req, res){
	var values = [req.user.username, req.body.lotto, req.body.urns];

	pool.query("INSERT INTO game2 (username, lotto, urns) VALUES ($1, $2, $3);", values, function(err, result){
		if(err){
			console.log("Error inserting items to database in pregame questionnaire");
			console.log(err);
			console.log("END");
			return;
		}
	});
});

app.get('/round3', function(req, res){
	res.render('pages/round3');
});

app.post('/round3/auth', function(req, res){
	var values = [req.user.username, req.body.lotto, req.body.urns];

	pool.query("INSERT INTO game3 (username, lotto, urns) VALUES ($1, $2, $3);", values, function(err, result){
		if(err){
			console.log("Error inserting items to database in pregame questionnaire");
			console.log(err);
			console.log("END");
			return;
		}
	});
});

app.get('/postgame', isLoggedIn, function(req, res){
	res.render('pages/postgame', {
		message: req.flash('loginMessage')
	});
});

app.post('/postgame/auth', function(req, res){
	console.log("YOUR USERNAME IS: " + req.user.username);
	var values = [req.user.username, req.body.lotto, req.body.urn];
	var i = 0;
	for(i=0; i < values.length; i++){
		console.log("VALUES: " + values[i]);
	}

	pool.query("INSERT INTO postgame (username, lotto, urn) VALUES ($1, $2, $3);", values, function(err, result){
		if(err){
			console.log("Error inserting items to database in pregame questionnaire");
			return;
		}
	});

	res.send({redirect: '/gameinfo'});
});

app.get('/finish', function(req, res){
	res.render('pages/finish');
});

app.get('/login', function(req, res){
	res.render('pages/login', { message: req.flash('loginMessage') });
});

app.post('/login/auth', passport.authenticate('local-login', {
    successRedirect : '/pregame', // redirect to pregame questionnaire if success
    failureRedirect : '/login', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

app.listen(port, function(){
	console.log("Listening on port " + port);
});

function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated()){
    	return next();
    }
    // if they aren't redirect them to the home page
    res.redirect('/');
}