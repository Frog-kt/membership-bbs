import { Router } from "express";
import isAuth from "../libs/isAuth";
import passport from "../libs/passport";

import {
	handleSuccessfulLogin,
	signup,
	login,
	logout,
} from "../controllers/auth";

const router = Router();

router.get("/auth/twitter", passport.authenticate("twitter"));
router.get(
	"/oauth/twitter/callback",
	passport.authenticate("twitter", {
		failureRedirect: "/signup",
	}),
	handleSuccessfulLogin
);
router.post("/signup", signup);
router.post("/login", login);
router.get("/logout", isAuth, logout);

router.get("/signup", async (req, res, next) => {
	res.render("signup");
});
router.get("/signup_ng", async (req, res, next) => {
	res.render("signup_ng");
});
router.get("/login", async (req, res, next) => {
	res.render("login");
});
router.get("/login_ng", async (req, res, next) => {
	res.render("login_ng");
});

export default router;
