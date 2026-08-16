import { Router } from "express";
import { getAllNotes } from "../controllers/notes.controllers.js";
import { addNote } from "../controllers/notes.controllers.js";
import { deleteNote } from "../controllers/notes.controllers.js";
import { authenticate } from "../../../middleware/authenticate.js";
const noteRoute = Router();

noteRoute.use(authenticate);

noteRoute.get('/', getAllNotes);
noteRoute.post('/', addNote);
noteRoute.delete('/:id', deleteNote);


export default noteRoute;
