export type Category = "yellow" | "green" | "blue" | "purple";

export interface Connection {
  category: Category;
  description: string;
  options: string[];
}

export interface Game {
  id: string;
  title: string;
  author?: string;
  connections: Connection[];
}

export type CamnectionsDoc = Record<string, Game>;
