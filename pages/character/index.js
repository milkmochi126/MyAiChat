import { useEffect } from "react";
import { useRouter } from "next/router";

export default function CharacterIndex() {
  const router = useRouter();
  
  // 重定向到角色列表頁面
  useEffect(() => {
    router.replace("/characters");
  }, [router]);
  
  // 顯示加載中狀態
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-300"></div>
    </div>
  );
} 