import express from "express";

const app = express();

app.set("view engine", "ejs");

app.get("/", (req, res) => {
	const message = "Hello World!";
	res.render("index", { message: message });
});

app.listen(3000, () => {
	console.log("Server running");
});
