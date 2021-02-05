import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";
import fs from "fs";
import multer from "multer";
import Joi from "joi";
import { prisma } from "../prisma";
import { matchPassword } from "../libs/password";
import isAuth from "../libs/isAuth";

export { handleSuccessfulLogin, signup, login, logout };

const handleSuccessfulLogin = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { id } = (req as any).user;
	const user = await prisma.user.findUnique({
		where: { id },
	});
	delete user.password;
	req.session.user = user;
	console.log(req.session.user);
	res.redirect("/");
};

const signup = async (req: Request, res: Response, next: NextFunction) => {
	const schema = Joi.object({
		display_name: Joi.string().required().min(3).max(32),
		login_name: Joi.string().required().min(3).max(32),
		password: Joi.string().required().min(8).max(255),
	});

	let value;
	try {
		value = await schema.validateAsync(req.body);
	} catch (err) {
		console.log(err);
		res.redirect("/signup_ng");
	}

	try {
		const user = await prisma.user.create({
			data: {
				display_name: value.display_name,
				login_name: value.login_name,
				password: value.password,
				profile: {
					create: {
						bio: "Hello BBS",
						icon_url: "/img/icon/icon.png",
					},
				},
			},
		});
	} catch (err) {
		console.log(err);
		res.redirect("/signup_ng");
	}

	res.redirect("login");
};

const login = async (req: Request, res: Response, next: NextFunction) => {
	const schema = Joi.object({
		login_name: Joi.string().required().min(3).max(32),
		password: Joi.string().required().min(8).max(255),
	});

	let value;
	try {
		value = await schema.validateAsync(req.body);
	} catch (err) {
		console.log(err);
		res.redirect("/login_ng");
	}

	let user;
	try {
		user = await prisma.user.findUnique({
			where: { login_name: value.login_name },
		});
	} catch (err) {
		console.log(err);
		res.redirect("/login_ng");
	}

	if (!(await matchPassword(value.password, user.password))) {
		res.redirect("/login_ng");
	}
	delete user.password;
	req.session.user = user;
	console.log(req.session.user);
	res.redirect("/");
};

const logout = async (req: Request, res: Response, next: NextFunction) => {
	req.session.destroy((err) => {
		res.redirect("/");
	});
};
