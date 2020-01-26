const express = require("express")
const NotesService = require("./notes-service")
const xss = require("xss")
const notesRouter = express.Router()
const jsonParser = express.json()
const path = require("path")

const serializeNote = note => ({
	id: note.id,
	note_name: xss(note.note_name),
	note_content: xss(note.note_content),
	date_published: note.date_published,
	folder_id: note.folder_id
})

notesRouter
	.route("/")
	.get((req, res, next) => {
		const knexInstance = req.app.get("db")
		NotesService.getAllNotes(knexInstance)
			.then(notes => {
				res.json(notes)
			})
			.catch(next)
	})
	.post(jsonParser, (req, res, next) => {
		const { note_name, note_content, date_published, folder_id } = req.body
		const newNote = { note_name, note_content, date_published, folder_id }

		for (const [key, value] of Object.entries(newNote))
			if (value == null)
				return res.status(400).json({
					error: { message: `Missing '${key}' in request body` }
				})

		newNote.date_published = date_published

		NotesService.insertNote(req.app.get("db"), newNote)
			.then(note => {
				res
					.status(201)
					.location(path.posix.join(req.originalUrl, `/${note.id}`))
					.json(serializeNote(note))
			})
			.catch(next)
	})
notesRouter
	.route("/:id")
	.all((req, res, next) => {
		NotesService.getById(req.app.get("db"), req.params.id)
			.then(note => {
				if (!note) {
					return res.status(404).json({
						error: { message: `Note doesn't exist` }
					})
				}
				res.note = note // save the folder for the next middleware
				next() // don't forget to call next so the next middleware happens!
			})

			.catch(next)
	})
	.patch(jsonParser, (req, res, next) => {
		const { note_name, note_content, date_published } = req.body
		const noteToUpdate = { note_name, note_content, date_published }
		const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length
		if (numberOfValues === 0) {
			return res.status(400).json({
				error: {
					message: `Request body must contain either 'note name' or 'content'`
				}
			})
		}
		NotesService.updateNote(req.app.get("db"), req.params.id, noteToUpdate)
			.then(numRowsAffected => {
				res.status(204).end()
			})
			.catch(next)
	})

	.get((req, res, next) => {
		res.json(serializeNote(res.note))
	})
	.delete((req, res, next) => {
		NotesService.deleteNote(req.app.get("db"), req.params.id)
			.then(() => {
				res.status(204).end()
			})
			.catch(next)
	})

module.exports = notesRouter
