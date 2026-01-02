const cron = require("node-cron");
const { db, admin } = require("../functions/src/config/firebase");

const getFilePathFromUrl = (downloadUrl) => {
  try {
    if (!downloadUrl) return null;
    const urlObj = new URL(downloadUrl);
    const pathName = urlObj.pathname;
    const indexOfO = pathName.indexOf("/o/");

    if (indexOfO === -1) return null;

    const encodedPath = pathName.substring(indexOfO + 3);
    const decodedPath = decodeURIComponent(encodedPath);

    return decodedPath;
  } catch (error) {
    console.error("Lỗi parse URL:", downloadUrl);
    return null;
  }
};

const initCronJob = () => {
  cron.schedule(
    "0 3 * * *",
    async () => {
      console.log("[CRON] Bắt đầu quét dọn Snaps quá hạn 24h...");

      try {
        const now = Date.now();
        const twentyFourHoursAgoDate = new Date(now - 24 * 60 * 60 * 1000);

        const cutoffTimestamp = admin.firestore.Timestamp.fromDate(
          twentyFourHoursAgoDate
        );
        const cutoffNumber = now - 24 * 60 * 60 * 1000;

        const q1 = db
          .collectionGroup("messages")
          .where("type", "==", "snap")
          .where("createdAt", "<=", cutoffTimestamp)
          .get();

        const q2 = db
          .collectionGroup("messages")
          .where("type", "==", "snap")
          .where("createdAt", "<=", cutoffNumber)
          .get();

        const [snap1, snap2] = await Promise.all([q1, q2]);

        const allDocsMap = new Map();
        snap1.docs.forEach((d) => allDocsMap.set(d.id, d));
        snap2.docs.forEach((d) => allDocsMap.set(d.id, d));

        const allDocs = Array.from(allDocsMap.values());

        if (allDocs.length === 0) {
          console.log("không có gì cần xóa");
          return;
        }

        console.log(`[CRON] Tìm thấy ${allDocs.length} snaps cần xử lý.`);

        const bucket = admin.storage().bucket();
        let deletedCount = 0;

        const BATCH_SIZE = 400;
        let batch = db.batch();
        let operationCounter = 0;

        for (const doc of allDocs) {
          const data = doc.data();
          const fileUrl = data.img;

          if (fileUrl) {
            const filePath = getFilePathFromUrl(fileUrl);
            if (filePath) {
              try {
                await bucket.file(filePath).delete();
                deletedCount++;
              } catch (err) {
                if (err.code !== 404) {
                  console.error(`Lỗi xóa file ${filePath}:`, err.message);
                }
              }
            }
          }

          batch.update(doc.ref, {
            type: "expired",
            img: null,
            file: null,
            text: "Snap expired",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          operationCounter++;

          if (operationCounter >= BATCH_SIZE) {
            await batch.commit();
            console.log(`Saved batch of ${operationCounter} updates.`);
            batch = db.batch();
            operationCounter = 0;
          }
        }

        if (operationCounter > 0) {
          await batch.commit();
        }

        console.log(
          `[CRON] Hoàn tất! Đã xóa ảnh của ${deletedCount} tin nhắn.`
        );
      } catch (error) {
        console.error("❌ [CRON] Lỗi hệ thống:", error);
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Ho_Chi_Minh",
    }
  );
};

module.exports = initCronJob;
