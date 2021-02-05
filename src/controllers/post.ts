import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";
import fs from "fs";
import multer from "multer";
import Joi from "joi";
import { prisma } from "../prisma";

export { postContent, getPosts };

const postContent = async (req: Request, res: Response, next: NextFunction) => {
	const schema = Joi.object({
		content: Joi.string().required().min(3).max(32),
	});

	let value;
	try {
		value = await schema.validateAsync(req.body);
	} catch (err) {
		console.log(err);
		res.redirect("/");
	}

	await prisma.post.create({
		data: {
			content: value.content,
			user_id: req.session.user.id,
		},
	});

	res.redirect("/");
};

const getPosts = async (req: Request, res: Response, next: NextFunction) => {
	const posts = await prisma.post.findMany({
		orderBy: [{ created_at: "desc" }],
		include: {
			author: {
				select: {
					display_name: true,
					profile: {
						select: {
							icon_url: true,
						},
					},
				},
			},
		},
	});

	let isLogin = false;
	let userId = "";
	try {
		if (req.session.user.id) {
			isLogin = true;
			userId = req.session.user.id;
		}
	} catch (err) {
		console.log(err);
	}
	console.log(posts);

	res.render("index", { posts, isLogin, userId });
};
