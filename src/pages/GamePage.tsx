import { Gamepad2 } from "lucide-react";
import GameGrid from "@/components/GameGrid";

export default function GamePage() {
  return (
    <div className="container max-w-5xl py-10 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Gamepad2 className="h-6 w-6" />
          </div>
          <h1 className="font-heading text-3xl font-bold">Quản lý Game</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-[60px]">
          Danh sách các trò chơi học tập tương tác giúp tăng cường kiến thức và tư duy.
        </p>
      </div>

      {/* Grid */}
      <GameGrid isAdmin />
    </div>
  );
}
