-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "notificationSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");
