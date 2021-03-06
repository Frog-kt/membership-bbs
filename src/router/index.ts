import passport, { Profile } from "passport";
import { Strategy as TwitterStrategy } from "passport-twitter";
import { v4 as uuid } from "uuid";
import fs from "fs";
import multer from "multer";
import Joi from "joi";
import { Router } from "express";
import { prisma } from "../prisma";
import { Request, Response, NextFunction } from "express";
import { matchPassword } from "../libs/password";
// import passport from "passport";
import { ModelUser } from "../db.types";

passport.serializeUser<string>((user: ModelUser, done) => {
	done(null, user.id);
});

passport.deserializeUser<string>((id, done) => {
	prisma.user
		.findUnique({
			where: {
				id,
			},
		})
		.then((user) => {
			done(null, user);
		})
		.catch((error) => {
			console.log(`Error: ${error}`);
		});
});

passport.use(
	new TwitterStrategy(
		{
			consumerKey: process.env.TWITTER_CONSUMER_KEY,
			consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
			callbackURL: "http://ec2-3-86-254-116.compute-1.amazonaws.com/oauth/twitter/callback",
		},
		async (accessToken, refreshToken, profile, cb) => {
			const user = await getUserByProviderProfile(
				accessToken,
				refreshToken,
				profile,
				"twitter"
			);
			cb(null, user);
		}
	)
);

async function getUserByProviderProfile(
	accessToken: string,
	refreshToken: string,
	profile: Profile,
	provider: "github" | "google" | "twitter"
) {
	// const email = profile.emails[0].value;
	const avatar = profile.photos[0].value;

	let oauthExisting;
	let userExisting;

	function createOAuthProfile(userId: string) {
		return prisma.oauth.create({
			data: {
				user: {
					connect: {
						id: userId,
					},
				},
				provider,
				oauth_user_id: profile.id,
			},
		});
	}

	oauthExisting = await prisma.oauth.findUnique({
		where: {
			oauth_user_id: profile.id,
		},
	});
	if (oauthExisting) {
		userExisting = await prisma.user.findUnique({
			where: {
				id: oauthExisting.user_id,
			},
		});
	}

	// If not found, create user and save oauth user id
	if (!userExisting) {
		userExisting = await prisma.user.create({
			data: {
				display_name: profile.displayName || profile.username,
				profile: {
					create: {
						bio: "Hello BBS",
						icon_url: avatar,
					},
				},
			},
		});
		oauthExisting = await createOAuthProfile(userExisting.id);
	}

	// update token
	if (
		accessToken !== oauthExisting.access_token ||
		refreshToken !== oauthExisting.refresh_token
	) {
		await prisma.oauth.update({
			where: {
				id: oauthExisting.id,
			},
			data: {
				access_token: accessToken,
				refresh_token: refreshToken,
			},
		});
	}

	return userExisting;
}

const isAuth = (req: any, res: any, next: any) => {
	// console.log(req.session);
	if (req.session.user.id) {
		next();
	} else {
		res.redirect("/login");
	}
};

const router = Router();
router.get("/", async (req, res, next) => {
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
});

router.get("/auth/twitter", passport.authenticate("twitter"));
router.get(
	"/oauth/twitter/callback",
	passport.authenticate("twitter", {
		failureRedirect: "/signup",
	}),
	async (req, res, next) => {
		const { id } = (req as any).user;
		const user = await prisma.user.findUnique({
			where: { id },
		});
		delete user.password;
		req.session.user = user;
		console.log(req.session.user);
		res.redirect("/");
	}
);

router.get("/signup", async (req, res, next) => {
	res.render("signup");
});
router.get("/signup_ng", async (req, res, next) => {
	res.render("signup_ng");
});
router.post("/signup", async (req, res, next) => {
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
});

router.get("/login", async (req, res, next) => {
	res.render("login");
});
router.get("/login_ng", async (req, res, next) => {
	res.render("login_ng");
});
router.post("/login", async (req, res, next) => {
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
});

router.get("/logout", isAuth, async (req, res, next) => {
	req.session.destroy((err) => {
		res.redirect("/");
	});
});

router.post("/post", isAuth, async (req, res, next) => {
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
});

router.get("/user/profile", isAuth, async (req, res, next) => {
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
});

const upload = multer({ storage: multer.memoryStorage() });
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
router.post(
	"/user/profile",
	upload.single("icon"),
	isAuth,
	async (req, res, next) => {
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
	}
);

router.get("/user/profile/:id", async (req, res, next) => {
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
});

export default router;
