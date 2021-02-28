import express from "express";
import router from "./router";
import bodyParser from "body-parser";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import cors from "cors";
import redis from "redis";
import connectRedis from "connect-redis";
import session from "express-session";
import passport from "passport";

const app = express();

app.set("trust proxy", 1);

const RedisStore = connectRedis(session);
const redisClient = redis.createClient({
	host: "localhost",
	port: 6379,
});

redisClient.on("error", function (err) {
	console.log("Could not establish a connection with redis. " + err);
});
redisClient.on("connect", function (err) {
	console.log("Connected to redis successfully");
});

app.use([
	passport.initialize(),
	cors(),
	rateLimit({ windowMs: 10 * 60 * 1000, max: 100 }),
	bodyParser.json(),
	bodyParser.urlencoded({ extended: true }),
	helmet(),
	helmet.contentSecurityPolicy({
		directives: {
			"default-src": ["'self'"],
			"img-src": ["'self'", "bbs-image.s3.amazonaws.com", "pbs.twimg.com"],
		},
	}),
	hpp(),
	cookieParser(),
	express.static("public"),
	express.json({ limit: "10kb" }),
	express.urlencoded({
		extended: true,
		limit: "10kb",
		type: "application/json",
	}),
	session({
		name: "session",
		store: new RedisStore({ client: redisClient }),
		secret: "secretkey",
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: false,
			httpOnly: false,
			maxAge: 10000 * 60 * 10,
		},
	}),
]);

app.set("view engine", "ejs");

app.use("/", router);

app.listen(3000, () => {
	console.log("Server running");
});
