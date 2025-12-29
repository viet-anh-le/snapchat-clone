import { useState } from "react";
import { Modal, message } from "antd";
import { ExclamationCircleFilled } from "@ant-design/icons";
import { chatService } from "../../../../lib/api";
import { useAuth } from "../../../../context/AuthContext";

export default function RemoveMemberModal({
  isOpen,
  onClose,
  chatId,
  targetUser,
  onSuccess,
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const isSelf = targetUser?.uid === user?.uid;

  const handleRemove = async () => {
    if (!targetUser || !chatId) return;

    setLoading(true);
    try {
      await chatService.removeMember(chatId, targetUser.uid);

      message.success(
        isSelf
          ? "Bạn đã rời nhóm thành công."
          : "Đã mời thành viên ra khỏi nhóm."
      );

      if (onSuccess) {
        onSuccess(isSelf);
      }
      onClose();
    } catch (error) {
      console.error(error);
      message.error("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-red-600">
          <ExclamationCircleFilled />
          {isSelf ? "Rời nhóm?" : "Mời ra khỏi nhóm?"}
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      onOk={handleRemove}
      confirmLoading={loading}
      okText={isSelf ? "Rời nhóm" : "Đồng ý"}
      okType="danger"
      cancelText="Hủy"
      centered
    >
      <p className="text-base">
        {isSelf ? (
          "Bạn có chắc chắn muốn rời khỏi nhóm này không? Bạn sẽ không thể xem tin nhắn cũ nữa."
        ) : (
          <span>
            Bạn có chắc chắn muốn mời thành viên{" "}
            <strong>{targetUser?.displayName}</strong> ra khỏi nhóm?
          </span>
        )}
      </p>
    </Modal>
  );
}
