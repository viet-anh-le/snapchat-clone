import { useState } from "react";
import { Modal, Select, message, Avatar } from "antd";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { chatService } from "../../../../lib/api/services/chat.service";

export default function AddMemberModal({
  isOpen,
  onClose,
  chatId,
  currentMembers,
  onSuccess,
}) {
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (value) => {
    if (!value || value.trim() === "") {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const usersRef = collection(db, "users");
    const q1 = query(
      usersRef,
      where("displayName", ">=", value),
      where("displayName", "<=", value + "\uf8ff")
    );
    const q2 = query(
      usersRef,
      where("email", ">=", value),
      where("email", "<=", value + "\uf8ff")
    );
    try {
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const temp = [];
      snap1.forEach((doc) => temp.push(doc.data()));
      snap2.forEach((doc) => temp.push(doc.data()));
      const unique = Array.from(
        new Map(temp.map((u) => [u.uid, u])).values()
      ).filter((u) => {
        const isAlreadyMember = currentMembers.includes(u.uid);
        return !isAlreadyMember;
      });

      setSearchResults(unique);
    } catch (error) {
      console.error("Lỗi tìm kiếm:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      await chatService.addMemberToGroup(chatId, selectedUserId);
      message.success("Đã thêm thành viên thành công!");
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
      setSelectedUserId(null);
    } catch (error) {
      message.error("Thất bại: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Thêm thành viên vào nhóm"
      open={isOpen}
      onCancel={onClose}
      onOk={handleAdd}
      confirmLoading={loading}
      okText="Thêm"
      cancelText="Hủy"
    >
      <p className="mb-2">Tìm kiếm người dùng:</p>
      <Select
        showSearch
        placeholder="Nhập tên người dùng..."
        style={{ width: "100%" }}
        filterOption={false}
        onSearch={handleSearch}
        onChange={setSelectedUserId}
        loading={searching}
        notFoundContent={searching ? "Đang tìm..." : "Không tìm thấy"}
      >
        {searchResults.map((user) => (
          <Select.Option key={user.uid} value={user.uid}>
            <div className="flex items-center gap-2">
              <Avatar
                src={user.photoURL || "/default-avatar.png"}
                size="small"
              />
              <span>{user.displayName}</span>
              <span className="text-gray-400 text-xs">({user.email})</span>
            </div>
          </Select.Option>
        ))}
      </Select>
    </Modal>
  );
}
