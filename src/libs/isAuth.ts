const isAuth = (req: any, res: any, next: any) => {
	// console.log(req.session);
	if (req.session.user.id) {
		next();
	} else {
		res.redirect("/login");
	}
};
export default isAuth;
