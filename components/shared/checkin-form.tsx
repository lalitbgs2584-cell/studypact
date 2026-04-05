import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, ImagePlus, Upload } from "lucide-react";

export function CheckinForm() {
  return (
    <Card className="bg-gradient-to-b from-zinc-900 to-black border-zinc-800 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-indigo-500 to-purple-600"></div>
      <CardHeader>
        <CardTitle className="text-xl">Daily Check-in</CardTitle>
        <CardDescription className="text-zinc-400">Upload proof of your work and a short reflection.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-zinc-700/50 rounded-2xl h-48 flex flex-col items-center justify-center bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-primary/50 transition-all cursor-pointer group">
          <div className="bg-zinc-800 p-4 rounded-full group-hover:scale-110 transition-transform">
            <Camera className="w-6 h-6 text-zinc-400 group-hover:text-primary transition-colors" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-300">Click to upload photo</p>
          <p className="text-xs text-zinc-500 mt-1">PNG, JPG, HEIC up to 10MB</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 ml-1">Daily Reflection</label>
          <Textarea 
            placeholder="What did you study today? Explain briefly..." 
            className="resize-none h-24 bg-zinc-900/50 border-zinc-800 focus-visible:ring-primary/50 text-zinc-100 rounded-xl"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full sm:w-auto ml-auto rounded-xl px-8 shadow-[0_0_20px_rgba(var(--primary),0.2)]">
          <Upload className="w-4 h-4 mr-2" />
          Submit Check-in
        </Button>
      </CardFooter>
    </Card>
  );
}
