var crypto = require("./crypto");
var tweets = require("./tweets");
var users = require("./users");
var async = require("async");

exports.getUser = function(req, res, next) {
    users.getUserFromCookie(req.cookies.id, function(user) {
        res.user = user;
        next();
    });
}

exports.index = function(req, res) {
    res.redirect(res.user ? '/' + res.user.id : '/signin');
}

exports.users = function(req, res) {
    users.getUsers(function(u) {
        res.render('users', {'users': u});
    });
}

exports.home = function(req, res) {
    var id = req.params.id;

    users.getUserFromId(id, function(user) {
        async.parallel([
                function(callback) {
                    tweets.getTweets(user, function(tweets) {
                        callback(null, tweets);
                    });
                },
                function(callback) {
                    users.getFollowers(id, function(followers) {
                        callback(null, followers);
                    });
                },
                function(callback) {
                    users.getPendings(id, function(pending) {
                        callback(null, pending);
                    });
                }
                ],

                function(err, results) {
                    res.render('home', {
                        'cookie_user': res.user,
                        'url_user': user,
                        'tweets': results[0],
                        'followers': results[1],
                        'pending': results[2]
                    });
                });
    });
}

exports.signin = function(req, res) {
    res.render('signin');
}

exports.signup = function(req, res) {
    var user = users.createUser();
    var keys = crypto.buildKeys();
    user.pub = keys.pub;
    users.createSession(res, user);
    users.saveUser(user);
    res.render('signup', {
        'user': user,
        'pub': crypto.toBase64(keys.pub),
        'priv': crypto.toBase64(keys.priv)
    });
}

exports.checkrandom = function(req, res) {
    var id = req.params.id;
    var random = req.body.id;
    if (id && random) {
        crypto.getIdByRandom(id, random, function(id) {
            if (id) {
                users.getUserFromId(id, function(user) {
                    users.createSession(res, user);
                    res.redirect('/');
                });
            } else {
                res.redirect('/signin');
            }
        });
    } else {
        res.redirect('/signin');
    }
}

exports.checkpub = function(req, res) {
    var id = req.body.id;
    if (id) {
        users.getUserFromId(id.replace(" ",""), function(user) {
            if (user) {
                var random = crypto.random(64);
                var randomId = crypto.saveRandom(user, random);
                res.render('checkpub', {
                    'cryptedrandom': crypto.encryptWithUser(user, random).toString(),
                    'randomid': randomId
                });
            } else {
                res.redirect('/signin');
            }
        });
    } else {
        res.redirect('/signin');
    }
}

exports.tweet = function(req, res) {
    if(res.user) {
        if (req.body.message) {
            tweets.saveTweet(res.user, req.body.message);
            res.redirect('/');
        } else {
            res.redirect('/signin');
        }
    } else {
        res.redirect('/signin');
    }
}

exports.tryfollow = function(req, res) {
    var userId = req.params.id;
    if (res.user && userId) {
        users.getUserFromId(userId, function(user) {
            if (user) {
                users.addPending(userId, res.user.id);
                res.redirect('/' + userId);
            } else {
                res.redirect('/signin');
            }
        });
    }
}

exports.follow = function(req, res) {
    var userId = req.params.id;
    if (res.user && userId) {
            users.addFollower(res.user.id, userId);
            res.redirect('/');
    } else {
        res.redirect('/signin');
    }
}
