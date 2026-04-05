import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function CreateGroupForm() {
  return (
    <Card className="bg-black/40 border-zinc-800/80 backdrop-blur-xl max-w-xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white">Create Study Group</CardTitle>
        <CardDescription className="text-zinc-400">Set up a new commitment pool with your peers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-zinc-300">Group Name</Label>
          <Input id="name" placeholder="e.g. Algorithms Fall 2026" className="bg-zinc-900 border-zinc-800 focus-visible:ring-primary/50 text-white" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deposit" className="text-zinc-300">Deposit Amount ($)</Label>
          <Input id="deposit" type="number" placeholder="50" className="bg-zinc-900 border-zinc-800 focus-visible:ring-primary/50 text-white" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan" className="text-zinc-300">Study Plan Document (Optional URL)</Label>
          <Input id="plan" type="url" placeholder="https://docs.google.com/..." className="bg-zinc-900 border-zinc-800 focus-visible:ring-primary/50 text-white" />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide">
          Generate Invite Token
        </Button>
      </CardFooter>
    </Card>
  );
}
