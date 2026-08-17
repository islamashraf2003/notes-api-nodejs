import Notes from "../../../models/Notes.js";

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getAllNotes = async (req, res, next) => {
    try {
        const allNotes = await Notes.find({ createdBy: req.user.id })
            .sort({ createdAt: -1 })
            .populate("createdBy", "name")
            .lean();
        return res.status(200).json({
            message: "Notes fetched successfully",
            data: allNotes,
        })
    } catch (error) {
        return next(error);
    }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const addNote = async (req, res, next) => {
    try {
        const { title, description } = req.body;
        const newNote = await Notes.create({
            title,
            description,
            createdBy: req.user.id,
        })
        return res.status(201).json({
            message: "Note added successfully",
            data: newNote,
        })
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: "Invalid note data",
                errors: Object.values(error.errors).map((e) => e.message),
            })
        }
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid user id",
            })
        }
        return next(error);
    }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const deleteNote = async (req, res, next) => {
    try {
        const deletedNote = await Notes.findOneAndDelete({
            _id: req.params.id,
            createdBy: req.user.id,
        });

        if (!deletedNote) {
            return res.status(404).json({
                message: "Note not found",
            })
        }

        return res.status(200).json({
            message: "Note deleted successfully",
            data: deletedNote,
        })
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid note id",
            })
        }
        return next(error);
    }
}
