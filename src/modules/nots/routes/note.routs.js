import { Router } from "express";
import { getAllNotes } from "../controllers/notes.controllers.js";
import { addNote } from "../controllers/notes.controllers.js";
import { deleteNote } from "../controllers/notes.controllers.js";
const noteRoute = Router();

noteRoute.get('/', getAllNotes);
noteRoute.post('/:id', addNote);
noteRoute.delete('/:id', deleteNote);


export default noteRoute; 