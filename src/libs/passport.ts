import passport, { Profile } from "passport";
import { Strategy as TwitterStrategy } from "passport-twitter";
import { prisma } from "../prisma";
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
			callbackURL:
				"http://localhost:3000/oauth/twitter/callback",
				// "http://ec2-3-86-254-116.compute-1.amazonaws.com/oauth/twitter/callback",
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

export default passport;
