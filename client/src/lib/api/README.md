# API Module Documentation

## Cấu trúc thư mục

```
api/
├── axios.config.js      # Axios instance với interceptors
├── apiClient.js          # API Client Builder Pattern
├── index.js              # Main export file
└── services/
    ├── chat.service.js   # Chat API services
    └── friend.service.js # Friend API services
```

## Cách sử dụng

### 1. Sử dụng Services (Khuyến nghị)

```javascript
import { chatService, friendService } from "@/lib/api";

// Chat APIs
const chat = await chatService.createGroup(selectedUsers, groupName);
const userChats = await chatService.getUserChats();

// Friend APIs
await friendService.sendFriendRequest(targetUid);
await friendService.acceptFriendRequest(targetUid);
await friendService.rejectFriendRequest(targetUid);
await friendService.blockUser(targetUid);
```

### 2. Sử dụng API Client Builder Pattern

```javascript
import { apiClient } from "@/lib/api";

// GET request
const data = await apiClient.get("/api/endpoint", { param1: "value" });

// POST request
const result = await apiClient.post("/api/endpoint", { key: "value" });

// Fluent API Builder
const response = await apiClient
  .method("POST")
  .url("/api/endpoint")
  .data({ key: "value" })
  .headers({ "Custom-Header": "value" })
  .execute();
```

### 3. Sử dụng Axios Instance trực tiếp (Advanced)

```javascript
import { axiosInstance } from "@/lib/api";

const response = await axiosInstance.get("/api/endpoint");
```

### 4. Legacy API Service (Backward Compatibility)

```javascript
import { apiService } from "@/lib/api";

// Vẫn hoạt động như cũ
await apiService.createGroup(selectedUsers, groupName);
await apiService.sendFriendRequest(targetUid);
```

## Features

### ✅ Axios Interceptors

- **Request Interceptor**: Tự động thêm auth token vào mọi request
- **Response Interceptor**: 
  - Xử lý lỗi toàn cục
  - Tự động refresh token khi token hết hạn (401)
  - Logging lỗi chi tiết

### ✅ Builder Pattern

API Client hỗ trợ fluent interface để xây dựng requests:

```javascript
apiClient
  .method("POST")
  .url("/api/endpoint")
  .data({ ... })
  .params({ ... })
  .headers({ ... })
  .execute()
```

### ✅ Service Pattern

Mỗi domain có service riêng để quản lý API calls:
- `chatService`: Tất cả API liên quan đến chat
- `friendService`: Tất cả API liên quan đến bạn bè

## Error Handling

Tất cả errors được xử lý tự động bởi interceptors. Bạn chỉ cần catch errors:

```javascript
try {
  const result = await chatService.createGroup(users, name);
} catch (error) {
  // error.message: Error message
  // error.status: HTTP status code
  // error.data: Response data (if any)
  console.error("Error:", error.message);
}
```

## Authentication

Auth token được tự động thêm vào mọi request thông qua request interceptor. Không cần thêm token thủ công.

