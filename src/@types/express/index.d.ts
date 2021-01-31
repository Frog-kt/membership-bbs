import { ModelUser } from "@/db.types";

declare namespace Express {
	export interface Request {
		user: any;
	}
}

declare module "express-session" {
	interface SessionData {
		user: ModelUser;
	}
}
