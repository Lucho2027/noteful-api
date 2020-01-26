const express = require("express");
const FoldersService = require("./folders-service");
const xss = require("xss");
const foldersRouter = express.Router();
const jsonParser = express.json();
const path = require("path");

const serializeFolder = folder => ({
	id: folder.id,
	folder_name: xss(folder.folder_name),
	date_published: folder.date_published
});

foldersRouter
	.route("/")
	.get((req, res, next) => {
		const knexInstance = req.app.get("db");
		FoldersService.getAllFolders(knexInstance)
			.then(folders => {
				res.json(folders);
			})
			.catch(next);
	})
	.post(jsonParser, (req, res, next) => {
		const name = req.body;
		const newFolder = name;

		for (const [key, value] of Object.entries(newFolder)) {
			if (value == null) {
				return res.status(400).json({
					error: { message: `Missing '${key}' in request body` }
				});
			}
		}

		FoldersService.insertFolder(req.app.get("db"), newFolder)
			.then(folder => {
				res
					.status(201)
					.location(path.posix.join(req.originalUrl, `/${folder.id}`))
					.json(folder);
			})
			.catch(next);
	});
foldersRouter
	.route("/:id")
	.all((req, res, next) => {
		FoldersService.getById(req.app.get("db"), req.params.id)
			.then(folder => {
				if (!folder) {
					return res.status(404).json({
						error: { message: `Folder doesn't exist` }
					});
				}
				res.folder = folder; // save the folder for the next middleware
				next(); // don't forget to call next so the next middleware happens!
			})
			.catch(next);
	})
	.delete((req, res, next) => {
		FoldersService.deleteFolder(req.app.get("db"), req.params.id)
			.then(() => {
				res.status(204).end();
			})
			.catch(next);
	})

	.get((req, res, next) => {
		res.json(serializeFolder(res.folder));
	});

module.exports = foldersRouter;
