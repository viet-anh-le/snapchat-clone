import {
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileZipOutlined,
  FileUnknownOutlined,
  DownloadOutlined,
  LoadingOutlined,
  FileImageOutlined,
} from "@ant-design/icons";

const FileMessage = ({ url, isOwner, isUploading }) => {
  const getFileName = (fileUrl) => {
    try {
      if (!fileUrl) return "Unknown File";
      const decodedUrl = decodeURIComponent(fileUrl);
      const baseName = decodedUrl.split("/").pop().split("?")[0];
      return baseName.replace(/^(snaps\/|files\/|chat_files\/)/, "");
    } catch (e) {
      return "File Attachment";
    }
  };

  const fileName = getFileName(url);
  const extension = fileName.split(".").pop().toLowerCase();

  const getFileIcon = () => {
    const style = { fontSize: 24 };
    switch (extension) {
      case "pdf":
        return <FilePdfOutlined style={{ ...style, color: "#ff4d4f" }} />;
      case "doc":
      case "docx":
        return <FileWordOutlined style={{ ...style, color: "#1890ff" }} />;
      case "xls":
      case "xlsx":
        return <FileExcelOutlined style={{ ...style, color: "#52c41a" }} />;
      case "zip":
      case "rar":
        return <FileZipOutlined style={{ ...style, color: "#faad14" }} />;
      case "png":
      case "jpg":
      case "jpeg":
        return <FileImageOutlined style={{ ...style, color: "#13c2c2" }} />;
      default:
        return <FileUnknownOutlined style={{ ...style, color: "#8c8c8c" }} />;
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-xl border min-w-[220px] max-w-[300px] transition-all
        ${
          isOwner
            ? "bg-blue-600/90 border-blue-500 text-white"
            : "bg-[#2b2b2b] border-gray-700 text-gray-200 hover:bg-[#333]"
        }
      `}
    >
      <div
        className={`
        p-2 rounded-lg flex items-center justify-center shrink-0
        ${isOwner ? "bg-blue-800/50" : "bg-gray-800"}
      `}
      >
        {getFileIcon()}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span className="font-semibold text-sm truncate" title={fileName}>
          {fileName}
        </span>
        <span
          className={`text-[10px] ${
            isOwner ? "text-blue-200" : "text-gray-400"
          }`}
        >
          {extension.toUpperCase()} File
        </span>
      </div>

      <div className="shrink-0 flex items-center justify-center">
        {isUploading ? (
          <div className="relative flex items-center justify-center">
            <LoadingOutlined spin style={{ fontSize: 20 }} />
          </div>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            download
            className={`
              p-2 rounded-full transition-all flex items-center justify-center
              ${
                isOwner
                  ? "hover:bg-blue-700 text-white"
                  : "hover:bg-gray-600 text-gray-300"
              }
            `}
            title="Download"
          >
            <DownloadOutlined style={{ fontSize: 18 }} />
          </a>
        )}
      </div>
    </div>
  );
};

export default FileMessage;
