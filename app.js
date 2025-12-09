import express from "express";
import "dotenv/config";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./db.js";

// Routes
import authRoutes from "./routes/auth.js";
import connectionRoutes from "./routes/connection.js";
import wishlistRoutes from "./routes/wishlist.js";
import notificationRoutes from "./routes/notification.js";
import chatRoutes from "./routes/chat.js";
import matchRoutes from "./routes/match.js";

import planRoutes from "./routes/plans.js";
import couponRoutes from "./routes/coupon.js";
import subscriptionRoutes from "./routes/subscription.js";
import paymentRoutes from "./routes/payments.js";

connectDB();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/connection", connectionRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/payment", paymentRoutes);
app.get("/", (req, res) => {
  res.json({ message: "Hello Nikha-e-muslim Backend! " });
});

// ✅ Create HTTP + Socket Server
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ✅ Store online users
const onlineUsers = new Map();

// ✅ Helper: Emit a notification to a specific user if online
const sendNotification = (userId, notification) => {
  const receiverSocketId = onlineUsers.get(userId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newNotification", notification);
    console.log(`📢 Notification sent to ${userId}`);
  } else {
    console.log(`⚪ ${userId} is offline. Notification saved in DB.`);
  }
};

io.on("connection", (socket) => {
  console.log("🟢 New user connected:", socket.id);

  // User joins with their ID
  socket.on("joinUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys())); // broadcast all online users
    console.log(`✅ ${userId} is online`);
  });

  // Join specific chat room
  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
    console.log(`💬 Joined chat room: ${chatId}`);
  });

  // Send message to chat
  socket.on("sendMessage", async (data) => {
    try {
      const { chatId, sender, receiverId, content } = data;

      // Broadcast message to the chat room
      io.to(chatId).emit("receiveMessage", data);

      // 🔄 Update lastMessage for both users’ chat lists
      [sender, receiverId].forEach((userId) => {
        const receiverSocket = onlineUsers.get(userId);
        if (receiverSocket) {
          io.to(receiverSocket).emit("updateChatList", {
            chatId,
            lastMessage: {
              content,
              createdAt: new Date(),
              sender,
              sentByMe: userId === sender,
              isSeen: userId === sender, // optional: adjust later
            },
          });
        }
      });

      console.log("📩 Message sent & chat list updated");
    } catch (error) {
      console.error("❌ sendMessage error:", error.message);
    }
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    for (const [userId, id] of onlineUsers.entries()) {
      if (id === socket.id) {
        onlineUsers.delete(userId);
        io.emit("onlineUsers", Array.from(onlineUsers.keys()));
        console.log(`🔴 ${userId} went offline`);
        break;
      }
    }
  });
});

// ✅ Start server
const PORT = process.env.PORT || 8000;
export { io, sendNotification };
server.listen(PORT, () =>
  console.log(`🔥 Server + Socket running on port ${PORT}`)
);
