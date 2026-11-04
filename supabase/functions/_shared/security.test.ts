import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { sanitizeForLLM } from "./security.ts";

Deno.test("sanitizeForLLM strictly strips < and > characters", () => {
  assertEquals(sanitizeForLLM("Hello <World>!"), "Hello World!");
  assertEquals(sanitizeForLLM("<script>alert('xss')</script>"), "scriptalert('xss')/script");
  assertEquals(sanitizeForLLM("No brackets here."), "No brackets here.");
  
  // Handle non-string input based on the implementation
  assertEquals(sanitizeForLLM(123 as any), 123 as any);
});
