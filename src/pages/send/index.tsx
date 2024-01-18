import { useState, useEffect } from "react";
import { appWindow } from "@tauri-apps/api/window";
import { TauriEvent } from "@tauri-apps/api/event";
import { Button, Empty, Flex } from "antd";
import { suspense } from "~/advance";
import { LazyFloatButtons, LazySendFileList } from "~/lazy";
import "./index.scss";
import { getFilesMetadata, getSendFilesUrlQrCode, getQrCodeState } from "~/api";
import { deleteRepetition } from "./utils";

interface SendProps {
  toHome: () => void;
}

const Send = ({ toHome }: SendProps) => {
  const [files, setFiles] = useState<SendFile[] | null>(null);

  const [qrcode, setQrcode] = useState<QrCode | null>(null);

  useEffect(() => {
    const unlisten = appWindow.listen<string[]>(
      TauriEvent.WINDOW_FILE_DROP,
      async (e) => {
        const paths = deleteRepetition(e.payload, files ?? []);
        const sendFiles = await getFilesMetadata(paths);

        setFiles((pre) => {
          return pre ? [...pre, ...sendFiles] : sendFiles;
        });
      },
    );

    return () => {
      unlisten.then((f) => f());
    };
  }, [files]);

  useEffect(() => {
    if (!qrcode) return;

    const timer = setInterval(async () => {
      const used = await getQrCodeState(qrcode.id);

      if (used) {
        clearTimeout(timer);
        setQrcode(null);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      location.reload();
    };
  }, [qrcode]);

  const removeFile = (path: string) =>
    setFiles((pre) => pre!.filter((f) => f.path !== path));

  const newSendFilesQrCode = async () => {
    const code = await getSendFilesUrlQrCode(files!);
    setQrcode(code);
  };

  if (qrcode) {
    return (
      <div className="container">
        <h2>扫码连接</h2>
        <div dangerouslySetInnerHTML={{ __html: qrcode.svg }} />

        {suspense(<LazyFloatButtons onClick={toHome} />)}
      </div>
    );
  }

  return (
    <>
      <Flex className="file-list-container" vertical>
        <Flex
          className="file-list"
          flex={1}
          justify={files?.length ? undefined : "center"}
          align={files?.length ? undefined : "center"}
          vertical
        >
          {files && files.length ? (
            suspense(<LazySendFileList data={files} removeFile={removeFile} />)
          ) : (
            <Empty description="将文件拖到此处" />
          )}
        </Flex>

        <Button
          style={{ marginTop: 10 }}
          disabled={!files?.length}
          onClick={newSendFilesQrCode}
        >
          确认
        </Button>
      </Flex>

      {suspense(
        <LazyFloatButtons
          onClick={toHome}
          clear={
            files && files.length
              ? () => {
                setFiles(null);
              }
              : undefined
          }
        />,
      )}
    </>
  );
};

export default Send;
