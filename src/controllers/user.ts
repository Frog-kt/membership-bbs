import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";
import fs from "fs";
import multer from "multer";
import Joi from "joi";
import { prisma } from "../prisma";

export { getUserProfile, updateUserProfile, settingUserProfile };

const allowFileTypes = [
	"image/jpeg",
	"image/svg+xml",
	"image/webp",
	"image/png",
	"image/gif",
];
const checkFileExt = (mimetype: string) => {
	if (allowFileTypes.includes(mimetype)) return true;
	return false;
};

const getUserProfile = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const userId = req.params.id;

	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			post: true,
			profile: true,
		},
	});

	if (!user) {
		res.render("user_error");
	}

	delete user.password;

	const postCount = user.post.length;

	let isMe = false;
	if (req.session.user) {
		if (userId == req.session.user.id) isMe = true;
	}

	res.render("userpage", { user, postCount, isMe });
};

const updateUserProfile = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const file = req.file;
	console.log(file);

	const nowUser = await prisma.user.findUnique({
		where: { id: req.session.user.id },
		include: {
			profile: true,
		},
	});

	let display_name = nowUser.display_name;
	if (!(display_name === req.body.display_name)) {
		display_name = req.body.display_name;
	}

	let bio = nowUser.profile.bio;
	if (!(bio === req.body.bio)) {
		bio = req.body.bio;
	}

	let icon_url = nowUser.profile.icon_url;
	if (file) {
		if (!checkFileExt(file.mimetype)) {
			res.render("profile_ng");
		}

		const imageId = uuid();
		const fileName = imageId + "-" + file.originalname;

		fs.writeFileSync(
			`public/img/icon/${fileName}`,
			Buffer.from(file.buffer),
			"binary"
		);

		icon_url = `/img/icon/${fileName}`;
	}

	const user = await prisma.user.update({
		where: { id: req.session.user.id },
		data: {
			display_name: req.body.display_name,
			profile: {
				update: {
					icon_url: icon_url,
					bio: bio,
				},
			},
		},
	});

	console.log(nowUser);
	console.log(user);

	res.redirect(`/user/profile/${req.session.user.id}`);
};

const settingUserProfile = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const userId = req.session.user.id;

	console.log(userId);

	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			profile: true,
		},
	});

	if (!user) {
		res.render("user_error");
	}

	delete user.password;

	console.log(user);

	res.render("profile", { user });
};
