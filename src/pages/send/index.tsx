import {
  createEffect,
  createSignal,
  onCleanup,
  createMemo,
  Show,
} from "solid-js";
import {
  AiOutlineClear,
  AiOutlineCloseCircle,
  AiOutlineHome,
} from "solid-icons/ai";
import { appWindow } from "@tauri-apps/api/window";
import { TauriEvent } from "@tauri-apps/api/event";
import "./index.scss";
import { getFilesMetadata, getSendFilesUrlQrCode, getQrCodeState } from "~/api";
import { deleteRepetition } from "./utils";
import { suspense } from "~/advance";
import {
  LazyButton,
  LazyEmpty,
  LazyFileTypeIcon,
  LazyFlex,
  LazyFloatButton,
  LazyFloatButtonGroup,
  LazyLink,
  LazyList,
  LazyListItem,
  LazyQrcode,
} from "~/lazy";
import { addClassNames } from "~/components/utils";
import { open } from "@tauri-apps/api/shell";

interface SendProps {
  toHome: () => void;
}

const Send = (props: SendProps) => {
  const [files, setFiles] = createSignal<SendFile[]>([]);

  const [qrcode, setQrcode] = createSignal<QrCode | null>(null);

  createEffect(() => {
    const unlisten = appWindow.listen<string[]>(
      TauriEvent.WINDOW_FILE_DROP,
      async (e) => {
        const paths = deleteRepetition(e.payload, files());
        const sendFiles = await getFilesMetadata(paths);

        setFiles((pre) => [...pre, ...sendFiles]);
      },
    );

    onCleanup(() => {
      unlisten.then((f) => f());
    });
  });

  createEffect(() => {
    const code = qrcode();
    if (!code) return;

    const timer = setInterval(async () => {
      const used = await getQrCodeState(code.id);

      if (used) {
        clearTimeout(timer);
        setQrcode(null);
      }
    }, 500);

    onCleanup(() => {
      clearTimeout(timer);
      location.reload();
    });
  });

  const removeFile = (path: string) =>
    setFiles((pre) => pre.filter((f) => f.path !== path));

  const newSendFilesQrCode = async () => {
    const code = await getSendFilesUrlQrCode(files());
    setQrcode(code);
  };

  const isEmpty = createMemo(() => files().length === 0);
  const filesPostion = () => (isEmpty() ? "center" : "start");

  return (
    <>
      <Show when={!qrcode()} fallback={<LazyQrcode qrcode={qrcode()!} />}>
        <LazyFlex
          class="send"
          align="center"
          justify="center"
          direction="vertical"
        >
          <div class="send-header">发送文件</div>

          <LazyFlex
            class={addClassNames(
              "file-list",
              !files().length ? "file-list-empty" : undefined,
            )}
            align={filesPostion()}
            justify={filesPostion()}
          >
            {files().length ? (
              <LazyList
                dataSource={files()}
                renderItem={(file) => (
                  <LazyListItem
                    avatar={LazyFileTypeIcon(file.extension)}
                    title={
                      <LazyLink onClick={() => open(file.path)}>
                        {file.name}
                      </LazyLink>
                    }
                    description={
                      <>
                        <span>大小: {file.size}</span>
                        &nbsp;&nbsp;&nbsp;&nbsp;
                        <span>类型: {file.extension}</span>
                      </>
                    }
                    extra={[
                      <LazyLink
                        class="delete-file"
                        onClick={() => removeFile(file.path)}
                      >
                        <AiOutlineCloseCircle />
                      </LazyLink>,
                    ]}
                  />
                )}
              />
            ) : (
              <LazyEmpty description="将文件拖到此处" />
            )}
          </LazyFlex>

          <LazyButton onClick={newSendFilesQrCode} block disabled={isEmpty()}>
            确认
          </LazyButton>
        </LazyFlex>
      </Show>

      {isEmpty() || qrcode()
        ? suspense(
          <LazyFloatButton
            icon={<AiOutlineHome />}
            onClick={props.toHome}
            tooltip="回到主页"
            bottom={qrcode() ? 20 : 60}
          />,
        )
        : suspense(
          <LazyFloatButtonGroup
            bottom={60}
            options={[
              {
                icon: <AiOutlineClear />,
                onClick: () => setFiles([]),
                tooltip: "清空文件",
              },
              {
                icon: <AiOutlineHome />,
                onClick: props.toHome,
                tooltip: "回到主页",
              },
            ]}
          />,
        )}
    </>
  );
};

export default Send;
