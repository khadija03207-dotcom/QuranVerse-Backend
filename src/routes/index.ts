import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import progressRouter from "./progress";
import bookmarksRouter from "./bookmarks";
import notesRouter from "./notes";
import hifzRouter from "./hifz";
import quizRouter from "./quiz";
import recitationRouter from "./recitation";
import tafseerRouter from "./tafseer";
import journalRouter from "./journal";
import hadithFavoritesRouter from "./hadith-favorites";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(progressRouter);
router.use(bookmarksRouter);
router.use(notesRouter);
router.use(hifzRouter);
router.use(quizRouter);
router.use(recitationRouter);
router.use(tafseerRouter);
router.use(journalRouter);
router.use(hadithFavoritesRouter);

export default router;
