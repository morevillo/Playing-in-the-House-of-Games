var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var path = require('path');
//var cors = require('cors');
var bcrypt = require('bcrypt-nodejs');
// var hash = bcrypt.hashSync(configAuth.bcryptHash.Hash);

var configAuth = require('./config/auth');

//Passport
var passport = require('passport');
var flash    = require('connect-flash');
var LocalStrategy   = require('passport-local').Strategy;

//Session
var session = require('express-session');
app.use(session({
	// secret: 'houseofgamessecret',
	secret: configAuth.sessionSecret.secret,
	saveUninitialized: true,
	resave: true,
	cookie: {
		path: '/',
		httpOnly: false,
		maxAge: 1800000 //30 minute Timeout
	}
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next){
    if(req.user){
    	// console.log("USERNAME JSON: " + JSON.stringify(req.user));
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

app.set('views', __dirname);
app.set('view engine', 'ejs');

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
		
		if(err){
			return done(err);
		}
		//Check if username exists
		if(!result.rows.length){
			console.log("Wrong username");
            return done(null, false, req.flash('loginMessage', 'Incorrect username/password'));
        }
        //Check if password is the same
        if(!bcrypt.compareSync(password, result.rows[0].password)){
        	console.log("Wrong password");
        	return done(null, false, req.flash('loginMessage', 'Incorrect username/password'));
        }
		else{
			//Successful login
			return done(null, result.rows[0]);
		}
	});

}));

//Passport Register/Signup
passport.use('local-signup', new LocalStrategy({
	usernameField : 'username',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
}, function(req, username, password, done){
	process.nextTick(function(){
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
							// password: password
							password: bcrypt.hashSync(password, null, null)//hash password
						};

						var values = [req.body.fname, req.body.lname, user.username, req.body.email, req.body.gender, req.body.age, req.body.ethnicity, user.password];
						pool.query("INSERT INTO users (fname, lname, username, email, gender, age, ethnicity, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);", values, function(err, result){
							//client.release();
							if(err){
								return done(err);
							}else{
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
	res.status(200);
    res.render('pages/home',{
    	message: req.flash('unauthorized')
    });
});

//Render Register page
app.get('/register', function(req, res){
	res.status(200);
	res.render('pages/register', { message: req.flash('signupMessage') });
});

//Go through passports local signup strategy
app.post('/register/auth', passport.authenticate('local-signup', {
        successRedirect : '/pregame', // redirect to pregame questionnaire if success
        failureRedirect : '/register', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
}));

// Render Terms and Conditions Page
app.get('/disclaimer',function(req, res){
	res.status(200);
	res.render('pages/disclaimer');
});

app.get('/pregame', isLoggedIn, function(req, res){
	res.status(200);
	res.render('pages/pregame', {
		message: req.flash('loginMessage')
	});
});

app.post('/pregame/auth', function(req, res){
	var values = [req.user.username, req.body.privacy_val, req.body.social_media, req.body.freq, req.body.fb_val];

	pool.query("INSERT INTO pregame (username, priv_val, social_media, freq, tnc) VALUES ($1, $2, $3, $4, $5);", values, function(err, result){
		if(err){
			res.status(500).send('Internal Server Error when adding row into pregame table');
			return;
		}
	});
	res.status(200);
	res.send({redirect: '/gameinfo'});
});

app.get('/gameinfo', isLoggedIn, function(req, res){
	res.status(200);
	res.render('pages/gameinfo');
});

app.put('/gameinfo/auth', function(req, res){
	var values = [req.body.opponent, req.user.username];

	pool.query("UPDATE users SET opponent=$1 WHERE username=$2;", values, function(err, result){
		if(err){
			res.status(500).send('Internal Server Error when updating row into users table');
			return;
		}
	});
	res.status(200);
});

app.get('/game', isLoggedIn, function(req, res){
	// res.render('pages/game');
	var result = {};
	var value = [req.user.username];
	pool.query('SELECT opponent FROM users WHERE username=$1', value, function(err, rows, fields){
    if(err){
      res.status(500).send('Internal Server Error when finding opponent');
      return;
    }
    result.results = {opponent:rows.rows[0].opponent};
    res.status(200);
    res.render('pages/game', {result:result});
  });
});

app.post('/game/auth', function(req, res){
	var values = [req.user.username, req.body.round1money, req.body.round1status];

	pool.query("INSERT INTO game1 (username, round1money, round1status) VALUES ($1, $2, $3);", values, function(err, result){
		if(err){
			res.status(500).send('Internal Server Error when adding row into game1 table');
			return;
		}
	});
	res.status(200);
});

app.get('/round2', isLoggedIn, function(req, res){
	// res.render('pages/round2');
	var result = {};
	var value = [req.user.username];
	pool.query('SELECT opponent FROM users WHERE username=$1', value, function(err, rows, fields){
    if(err){
      next(err);
      res.status(500).send('Internal Server Error when finding opponent');
      return;
    }
    result.results = {opponent:rows.rows[0].opponent};
    res.status(200);
    res.render('pages/round2', {result:result});
  });
});

app.post('/round2/auth', function(req, res){
	var values = [req.user.username, req.body.round2money, req.body.round2status];

	pool.query("INSERT INTO game2 (username, round2money, round2status)  VALUES ($1, $2, $3);", values, function(err, result){
		if(err){
			res.status(500).send('Internal Server Error when adding row into game2 table');
			return;
		}
	});
	res.status(200);
});

app.get('/round3', isLoggedIn, function(req, res){
	// res.render('pages/round3');
	var result = {};
	var value = [req.user.username];
	pool.query('SELECT opponent FROM users WHERE username=$1', value, function(err, rows, fields){
    if(err){
      res.status(500).send('Internal Server Error when finding opponent');
      next(err);
      return;
    }
    result.results = {opponent:rows.rows[0].opponent};
    res.status(200);
    res.render('pages/round3', {result:result});
  });
});

app.post('/round3/auth', function(req, res){
	var values = [req.user.username, req.body.round3money, req.body.round3status];

	pool.query("INSERT INTO game3 (username, round3money, round3status) VALUES ($1, $2, $3);", values, function(err, result){
		if(err){
			res.status(500).send('Internal Server Error when adding row into game3 table');
			return;
		}
	});
	res.status(200);
});

app.get('/summary', isLoggedIn, function(req, res){
	// Have query to get info from round1 table to send over to front end to show round 1 results
	var result = {};
	var value = [req.user.username];
  	pool.query('SELECT round1status, round1money FROM game1 WHERE username=$1', value, function(err, rows, fields){
    if(err){
      res.status(500).send('Internal Server Error when showing summary page');
      next(err);
      return;
    }
    result.results = {status:rows.rows[0].round1status,
    	money: rows.rows[0].round1money};
    res.status(200);
    res.render('pages/summary', {result:result});
  });
});

app.get('/summary2', isLoggedIn, function(req, res){
	// Have query to get info from round1 table to send over to front end to show round 2 results
	var result = {};
	var value = [req.user.username];
  	pool.query('SELECT round2status, round2money FROM game2 WHERE username=$1', value, function(err, rows, fields){
    if(err){
    	res.status(500).send('Internal Server Error when showing summary page');
      	next(err);
      	return;
    }
    result.results = {status:rows.rows[0].round2status,
    	money: rows.rows[0].round2money};
    res.status(200);
    res.render('pages/summary2', {result:result});
  });
});

app.get('/summary3', isLoggedIn, function(req, res){
	// Have query to get info from round1 table to send over to front end to show overall results
	var result = {};
	var value = [req.user.username];
  	pool.query('SELECT * FROM users NATURAL JOIN game1 NATURAL JOIN game2 NATURAL JOIN game3 WHERE username=$1', value, function(err, rows, fields){
    if(err){
    	res.status(500).send('Internal Server Error when showing summary page');
     	next(err);
      	return;
    }
    result.results = {
    	opponent: rows.rows[0].opponent,
    	status1: rows.rows[0].round1status,
    	status2: rows.rows[0].round2status,
    	status3:rows.rows[0].round3status,
    	money1: rows.rows[0].round1money,
    	money2: rows.rows[0].round2money,
    	money3: rows.rows[0].round3money
    };
    res.status(200);
    res.render('pages/summary3', {result:result});
  });
});

app.get('/postgame', isLoggedIn, function(req, res){
	res.status(200);
	res.render('pages/postgame', {
		message: req.flash('loginMessage')
	});
});

app.post('/postgame/auth', function(req, res){
	var values = [req.user.username, req.body.lotto, req.body.urn, req.body.real_person, req.body.purpose, req.body.concern];
	
	pool.query("INSERT INTO postgame (username, lotto, urn, real_person, purpose, concern) VALUES ($1, $2, $3, $4, $5, $6);", values, function(err, result){
		if(err){
			res.status(500).send('Internal Server Error when adding row into table');
			return;
		}
	});
	res.status(200);
	res.send({redirect: '/finish'});
});

app.get('/finish', function(req, res){
	res.status(200);
	res.render('pages/finish');
});

app.get('/login', function(req, res){
	res.status(200);
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
    req.flash('unauthorized', 'You do not have permission to access this content. Please login or sign up first!');
    res.redirect('/');
}