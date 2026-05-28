import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import metaCredentialsRouter from "./meta-credentials";
import postsRouter from "./posts";
import rulesRouter from "./rules";
import commentsRouter from "./comments";
import activityLogsRouter from "./activity-logs";
import analyticsRouter from "./analytics";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhooksRouter);   // webhooks before auth middleware
router.use(authRouter);
router.use(metaCredentialsRouter);
router.use(postsRouter);
router.use(rulesRouter);
router.use(commentsRouter);
router.use(activityLogsRouter);
router.use(analyticsRouter);

export default router;
