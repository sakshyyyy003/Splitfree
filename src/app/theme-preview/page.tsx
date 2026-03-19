import { ArrowRight, Plus } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ThemePreviewPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-4xl border border-border bg-card/90 p-6 shadow-soft sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Theme Preview
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>Warm Theme</Badge>
            <Badge variant="secondary">INR First</Badge>
            <Badge variant="outline">Rounded Surfaces</Badge>
          </div>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold text-foreground sm:text-5xl">
            Splitfree shadcn theme tokens applied to real components.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            This page exists for quick visual verification that the app is using
            the warm palette, rounded surfaces, and medium-density inputs from
            the design spec.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg">
              Add Expense
              <Plus />
            </Button>
            <Button variant="outline" size="lg">
              View Groups
            </Button>
            <Button variant="secondary" size="lg">
              Settle Up
            </Button>
            <Button variant="ghost" size="lg">
              Learn More
            </Button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle>Dashboard Summary</CardTitle>
              <CardDescription>
                Dark and warm surfaces should feel calm, not corporate.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-panel">
                <p className="text-sm text-primary-foreground/70">You are owed</p>
                <p className="mt-2 text-4xl font-extrabold">₹2,480</p>
                <p className="mt-2 text-sm text-primary-foreground/80">
                  Across Goa Trip, Flat 4B, and Team Lunch
                </p>
              </div>
              <div className="rounded-3xl bg-secondary p-5">
                <p className="text-sm text-muted-foreground">Pinned balance</p>
                <p className="mt-2 text-3xl font-extrabold text-foreground">
                  +₹1,240
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Aditi owes Rahul ₹640
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/70">
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Avatar shape and list density should match the exploration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {["Rahul", "Aditi", "Kabir"].map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-2xl bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold">{name}</p>
                      <p className="text-sm text-muted-foreground">
                        {name === "Rahul" ? "Admin" : "Member"}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add Expense Form Styling</CardTitle>
              <CardDescription>
                Inputs should use soft filled surfaces with bold labels.
              </CardDescription>
            </CardHeader>n
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-bold">Description</label>
                <Input defaultValue="Dinner at Thalassa" />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-bold">Amount (INR)</label>
                  <Input defaultValue="3200" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-bold">Category</label>
                  <Select defaultValue="food">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="accommodation">Accommodation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold">Note</label>
                <Textarea defaultValue="Sunset dinner with shared starters." />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle>Action Hierarchy</CardTitle>
              <CardDescription>
                The primary action should be visually dominant without making
                the surface noisy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl bg-accent p-5">
                <p className="text-sm text-muted-foreground">Suggested settlement</p>
                <p className="mt-2 text-3xl font-extrabold">Aditi pays Rahul ₹640</p>
              </div>
              <Tabs defaultValue="equal" className="w-full">
                <TabsList>
                  <TabsTrigger value="equal">Equal</TabsTrigger>
                  <TabsTrigger value="exact">Exact</TabsTrigger>
                  <TabsTrigger value="shares">Shares</TabsTrigger>
                </TabsList>
                <TabsContent value="equal" className="rounded-3xl bg-secondary p-4">
                  Everyone pays ₹800.
                </TabsContent>
                <TabsContent value="exact" className="rounded-3xl bg-secondary p-4">
                  Exact rupee amounts are assigned per member.
                </TabsContent>
                <TabsContent value="shares" className="rounded-3xl bg-secondary p-4">
                  Ratio split such as 2:1:1.
                </TabsContent>
              </Tabs>
              <Progress value={68}>
                <ProgressLabel>March group spend</ProgressLabel>
                <ProgressValue />
              </Progress>
              <div className="flex flex-wrap gap-3">
                <Button>Record Settlement</Button>
                <Button variant="outline">Save Draft</Button>
                <Tooltip>
                  <TooltipTrigger render={<Button variant="ghost">Cancel</Button>} />
                  <TooltipContent>Use ghost only for low-emphasis actions.</TooltipContent>
                </Tooltip>
                <Button variant="destructive">Delete Expense</Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
