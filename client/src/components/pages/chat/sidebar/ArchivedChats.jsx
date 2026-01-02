import UserChat from "./User";

export default function ArchivedChats({ allChats, onBack }) {
  const archivedList = allChats.filter((chat) => chat.isArchived);

  return (
    <div className="bg-[#121212] h-full flex flex-col">
      <div className="p-4 border-b border-gray-700 flex items-center gap-2">
        <button onClick={onBack} className="text-white">
          ← Quay lại
        </button>
        <h2 className="text-white font-bold">Kho lưu trữ</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {archivedList.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">Trống</p>
        ) : (
          archivedList.map((chat) => (
            <UserChat
              key={chat.chatId}
              receiver={chat?.receiver}
              chat={chat}
              isGroup={chat.isGroup}
              isArchived={true}
            />
          ))
        )}
      </div>
    </div>
  );
}
