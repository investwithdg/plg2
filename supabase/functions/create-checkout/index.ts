import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleRequest } from "./handler.ts";
import { defaultDeps } from "./deps.ts";

serve((req) => handleRequest(req, defaultDeps()));
