import { useState, useMemo } from "react";
import { Modal, Select, message, Avatar, Empty, Spin } from "antd";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { chatService } from "../../../../lib/api/services/chat.service";
import { UserAddOutlined, SearchOutlined } from "@ant-design/icons";
import debounce from "lodash/debounce";

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

  const dbSearch = useMemo(() => {
    const loadOptions = async (value) => {
      if (!value || value.trim() === "") {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearchResults([]);
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
          return !currentMembers.includes(u.uid);
        });

        setSearchResults(unique);
      } catch (error) {
        console.error("Lỗi tìm kiếm:", error);
      } finally {
        setSearching(false);
      }
    };

    return debounce(loadOptions, 500);
  }, [currentMembers]);

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      await chatService.addMemberToGroup(chatId, selectedUserId);
      message.success("Đã thêm thành viên thành công!");
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      message.error("Thất bại: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUserId(null);
    setSearchResults([]);
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-white border-b border-gray-700 pb-3">
          <UserAddOutlined className="text-blue-400" />
          <span>Thêm thành viên mới</span>
        </div>
      }
      open={isOpen}
      onCancel={handleClose}
      onOk={handleAdd}
      confirmLoading={loading}
      okText="Thêm vào nhóm"
      cancelText="Hủy bỏ"
      centered
      width={500}
      styles={{
        content: {
          backgroundColor: "#1f1f1f",
          padding: "20px",
          borderRadius: "16px",
          border: "1px solid #333",
        },
        header: {
          backgroundColor: "transparent",
          marginBottom: 0,
        },
        mask: {
          backdropFilter: "blur(4px)",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
      }}
      okButtonProps={{
        style: {
          backgroundColor: "#3b82f6",
          borderColor: "#3b82f6",
          fontWeight: 600,
        },
        disabled: !selectedUserId,
      }}
      cancelButtonProps={{
        style: {
          backgroundColor: "transparent",
          borderColor: "#4b5563",
          color: "#9ca3af",
        },
        className: "hover:!text-white hover:!border-white",
      }}
    >
      <div className="mt-4">
        <p className="text-gray-400 mb-2 text-sm">
          Tìm kiếm bằng tên hoặc email người dùng:
        </p>

        <Select
          showSearch
          placeholder={
            <div className="text-gray-500 flex items-center gap-2">
              <SearchOutlined /> Nhập tên người dùng...
            </div>
          }
          style={{
            width: "100%",
            height: "50px",
          }}
          filterOption={false}
          onSearch={dbSearch}
          onChange={setSelectedUserId}
          value={selectedUserId}
          notFoundContent={
            searching ? (
              <div className="p-4 text-center">
                <Spin size="small" />{" "}
                <span className="ml-2 text-gray-400">Đang tìm...</span>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-gray-500">
                    Không tìm thấy người dùng
                  </span>
                }
              />
            )
          }
          popupClassName="custom-select-dropdown"
          dropdownStyle={{
            backgroundColor: "#2d2d2d",
            border: "1px solid #444",
            borderRadius: "12px",
            padding: "8px",
          }}
          className="custom-ant-select"
        >
          {searchResults.map((user) => (
            <Select.Option key={user.uid} value={user.uid}>
              <div className="flex items-center gap-3 py-1 group">
                <Avatar
                  src={user.photoURL || "/default-avatar.png"}
                  size={40}
                  className="border border-gray-600"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-200 group-hover:text-white transition-colors">
                    {user.displayName}
                  </span>
                  <span className="text-gray-500 text-xs group-hover:text-gray-400 transition-colors">
                    {user.email}
                  </span>
                </div>
              </div>
            </Select.Option>
          ))}
        </Select>
      </div>

      <style jsx global>{`
        .custom-ant-select .ant-select-selector {
          background-color: #2d2d2d !important;
          border: 1px solid #444 !important;
          border-radius: 12px !important;
          color: white !important;
          display: flex;
          align-items: center;
        }
        .custom-ant-select .ant-select-selection-placeholder {
          color: #6b7280 !important;
        }
        .custom-ant-select .ant-select-arrow {
          color: #9ca3af !important;
        }
        /* Style cho item trong dropdown khi hover/select */
        .custom-select-dropdown .ant-select-item {
          border-radius: 8px;
          margin-bottom: 4px;
          color: white;
        }
        .custom-select-dropdown .ant-select-item-option-selected {
          background-color: #3b82f6 !important; /* Màu xanh khi chọn */
        }
        .custom-select-dropdown .ant-select-item-option-active {
          background-color: #3f3f46 !important; /* Màu xám khi hover */
        }
      `}</style>
    </Modal>
  );
}
