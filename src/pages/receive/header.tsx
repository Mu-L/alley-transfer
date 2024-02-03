import { open as pick } from "@tauri-apps/api/dialog";
import { open } from "@tauri-apps/api/shell";
import { createEffect, createSignal, onMount } from "solid-js";
import { changeDownloadsDir, getDownloadsDir, isLinux } from "~/api";
import type { MenuItemProps } from "~/components/dropdown";
import Loading from "~/components/loading";
import { LazyCol, LazyDropdown, LazyLink, LazyRow } from "~/lazy";

const baseClassName = "receive-header";

const Header = () => {
  const [downloadDir, setDownloadDir] = createSignal<string | undefined>(
    undefined,
  );
  const [openDropDown, setOpenDropDown] = createSignal(false);

  const [dropdownTop, setDownloadTop] = createSignal(40);

  onMount(() => {
    isLinux().then((f) => f && setDownloadTop(30));
  });

  createEffect(() => {
    const dir = downloadDir();
    if (dir) return;

    getDownloadsDir().then((d) => setDownloadDir(d));
  });

  const pickDirectory = async () => {
    const dir = (await pick({
      directory: true,
      defaultPath: downloadDir(),
      multiple: false,
      title: "选择其他目录", // https://github.com/tauri-apps/tauri/issues/6675
    })) as string | null;

    if (!dir) return;

    await changeDownloadsDir(dir);

    setDownloadDir(dir);
  };

  const dropdownItems: MenuItemProps[] = [
    {
      label: "打开",
      onClick: () => open(downloadDir()!),
    },
    {
      label: "修改",
      onClick: () => pickDirectory(),
    },
  ];

  if (!downloadDir) return <Loading />;

  return (
    <LazyRow class={baseClassName}>
      <LazyCol span={5} class={`${baseClassName}-label`}>
        <LazyDropdown
          open={openDropDown()}
          menu={dropdownItems}
          top={dropdownTop()}
          left={18}
        >
          <span class={`${baseClassName}-label-text`}>保存目录：</span>
        </LazyDropdown>
      </LazyCol>

      <LazyCol span={14} class={`${baseClassName}-directory-entry`}>
        <LazyLink
          onClick={async () => {
            setOpenDropDown(false);
            open(downloadDir()!);
          }}
          wrap
        >
          {downloadDir()!}
        </LazyLink>
      </LazyCol>
    </LazyRow>
  );
};

export default Header;
