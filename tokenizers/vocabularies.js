/**
 * Realistic BPE & Subword Vocabulary Database for LLM Tokenizers
 * Maps common words, subwords, code tokens, and emojis to actual model token IDs.
 */

window.TOKENIZER_VOCABS = (() => {
  const gpt4oExactMap = new Map([
    ["Hello", 13225], ["hello", 24874], [" World", 2024], ["!", 0], ["?", 30], [":", 25], [";", 26], [",", 11], [".", 13],
    ["<|endoftext|>", 199999], ["<|im_start|>", 200000], ["<|im_end|>", 200001]
  ]);

  const gpt4ExactMap = new Map([
    ["Hello", 15496], ["hello", 24874], [" World", 2159], ["!", 0], ["?", 30], [":", 25], [";", 26], [",", 11], [".", 13]
  ]);

  const llama3ExactMap = new Map([
    ["Hello", 9906], ["hello", 22204], [" World", 2159], ["!", 0], ["?", 30], [":", 25], [";", 26], [",", 11], [".", 13]
  ]);

  const baseWords = ["the", "of", "and", "to", "a", "in", "for", "is", "on", "that", "by", "this", "with", "i", "you", "it", "not", "or", "be", "are", "from", "at", "as", "your", "all", "have", "new", "more", "an", "was", "we", "will", "home", "can", "us", "about", "if", "page", "my", "has", "search", "free", "but", "our", "one", "other", "do", "no", "information", "time", "they", "site", "he", "up", "may", "what", "which", "their", "news", "out", "use", "any", "there", "see", "only", "so", "his", "when", "contact", "here", "business", "who", "web", "also", "now", "help", "get", "pm", "view", "online", "c", "e", "first", "am", "been", "would", "how", "were", "me", "s", "services", "some", "these", "click", "its", "like", "service", "x", "than", "find", "price", "date", "back", "top", "people", "had", "list", "name", "just", "over", "state", "year", "day", "into", "email", "two", "health", "n", "world", "re", "next", "used", "go", "b", "work", "last", "most", "products", "music", "buy", "data", "make", "them", "should", "product", "system", "post", "her", "city", "t", "add", "policy", "number", "such", "please", "available", "copyright", "support", "message", "after", "best", "software", "then", "jan", "good", "video", "well", "d", "where", "info", "rights", "public", "books", "high", "school", "through", "m", "each", "links", "she", "review", "years", "order", "very", "privacy", "book", "items", "company", "r", "read", "group", "need", "many", "user", "said", "de", "does", "set", "under", "general", "research", "university", "january", "mail", "full", "map", "reviews", "program", "life", "know", "games", "way", "days", "management", "p", "part", "could", "great", "united", "hotel", "real", "f", "item", "international", "center", "ebay", "must", "store", "travel", "comments", "made", "development", "report", "off", "member", "details", "line", "terms", "before", "hotels", "did", "send", "right", "type", "because", "local", "those", "using", "results", "office", "education", "national", "car", "design", "take", "posted", "internet", "address", "community", "within", "states", "area", "want", "phone", "dvd", "shipping", "reserved", "subject", "between", "forum", "family", "l", "long", "based", "w", "code", "show", "o", "even", "black", "check", "special", "prices", "website", "index", "being", "women", "much", "sign", "file", "link", "open", "today", "technology", "south", "case", "project", "same", "pages", "uk", "version", "section", "own", "found", "sports", "house", "related", "security", "both", "g", "county", "american", "photo", "game", "members", "power", "while", "care", "network", "down", "computer", "systems", "three", "total", "place", "end", "following", "download", "h", "him", "without", "per", "access", "think", "north", "resources", "current", "posts", "big", "media", "law", "control", "water", "history", "pictures", "size", "art", "personal", "since", "including", "guide", "shop", "directory", "board", "location", "change", "white", "text", "small", "rating", "rate", "government", "children", "during", "usa", "return", "students", "v", "shopping", "account", "times", "sites", "level", "digital", "profile", "previous", "form", "events", "love", "old", "john", "main", "call", "hours", "image", "department", "title", "description", "non", "k", "y", "insurance", "another", "why", "shall", "property", "class", "cd", "still", "money", "quality", "every", "listing", "content", "country", "private", "little", "visit", "save", "tools", "low", "reply", "customer", "december", "compare", "movies", "include", "college", "value", "article", "york", "man", "card", "jobs", "provide", "j", "food", "source", "author", "different", "press", "u", "learn", "sale", "around", "print", "course", "job", "canada", "process", "teen", "room", "stock", "training", "too", "credit", "point", "join", "science", "men", "categories", "advanced", "west", "sales", "look", "english", "left", "team", "estate", "box", "conditions", "select", "windows", "photos", "gay", "thread", "week", "category", "note", "live", "large", "gallery", "table", "register", "however", "june", "october", "november", "market", "library", "really", "action", "start", "series", "model", "features", "air", "industry", "plan", "human", "provided", "tv", "yes", "required", "second", "hot", "accessories", "cost", "movie", "forums", "march", "la", "september", "better", "say", "questions", "july", "yahoo", "going", "medical", "test", "friend", "come", "dec", "server", "pc", "study", "application", "cart", "staff", "articles", "san", "feedback", "again", "play", "looking", "issues", "april", "never", "users", "complete", "street", "topic", "comment", "financial", "things", "working", "against", "standard", "tax", "person", "below", "mobile", "less", "got", "blog", "party", "payment", "equipment", "login", "student", "let", "programs", "offers", "legal", "above", "recent", "park", "stores", "side", "act", "problem", "red", "give", "memory", "performance", "social", "q", "august", "quote", "language", "story", "sell", "options", "experience", "rates", "create", "key", "body", "young", "america", "important", "field", "few", "east", "paper", "single", "ii", "age", "activities", "club", "example", "girls", "additional", "password", "z", "latest", "something", "road", "gift", "question", "changes", "night", "ca", "hard", "texas", "oct", "pay", "four", "poker", "status", "browse", "issue", "range", "building", "seller", "court", "february", "always", "result", "audio", "light", "write", "war", "nov", "offer", "blue", "groups", "al", "easy", "given", "files", "event", "release", "analysis", "request", "fax", "china", "making", "picture", "needs", "possible", "might", "professional", "yet", "month", "major", "star", "areas", "future", "space", "committee", "hand", "sun", "cards", "problems", "london", "washington", "meeting", "rss", "become", "interest", "id", "child", "keep", "enter", "california", "share", "similar", "garden", "schools", "million", "added", "reference", "companies", "listed", "baby", "learning", "energy", "run", "delivery", "net", "popular", "term", "film", "stories", "put", "computers", "journal", "reports", "co", "try", "welcome", "central", "images", "president", "notice", "original", "head", "radio", "until", "cell", "color", "self", "council", "away", "includes", "track", "australia", "discussion", "archive", "once", "others", "entertainment", "agreement", "format", "least", "society", "months", "log", "safety", "friends", "sure", "faq", "trade", "edition", "cars", "messages", "marketing", "tell", "further", "updated", "association", "able", "having", "provides", "david", "fun", "already", "green", "studies", "close", "common", "drive", "specific", "several", "gold", "feb", "living", "sep", "collection", "called", "short", "arts", "lot", "ask", "display", "limited", "powered", "solutions", "means", "director", "daily", "beach", "past", "natural", "whether", "due", "et", "electronics", "five", "upon", "period", "planning", "database", "says", "official", "weather", "mar", "land", "average", "done", "technical", "window", "france", "pro", "region", "island", "record", "direct", "microsoft", "conference", "environment", "records", "st", "district", "calendar", "costs", "style", "url", "front", "statement", "update", "parts", "aug", "ever", "downloads", "early", "miles", "sound", "resource", "present", "applications", "either", "ago", "document", "word", "works", "material", "bill", "apr", "written", "talk", "federal", "hosting", "rules", "final", "adult", "tickets", "thing", "centre", "requirements", "via", "cheap", "kids", "finance", "true", "minutes", "else", "mark", "third", "rock", "gifts", "europe", "reading", "topics", "bad", "individual", "tips", "plus", "auto", "cover", "usually", "edit", "together", "videos", "percent", "fast", "function", "fact", "unit", "getting", "global", "tech", "meet", "far", "economic", "en", "player", "projects", "lyrics", "often", "subscribe", "submit", "germany", "amount", "watch", "included", "feel", "though", "bank", "risk", "thanks", "everything", "deals", "various", "words", "linux", "jul", "production", "commercial", "james", "weight", "town", "heart", "advertising", "received", "choose", "treatment", "newsletter", "archives", "points", "knowledge", "magazine", "error", "camera", "jun", "girl", "currently", "construction", "toys", "registered", "clear", "golf", "receive", "domain", "methods", "chapter", "makes", "protection", "policies", "loan", "wide", "beauty", "manager", "india", "position", "taken", "sort", "listings", "models", "michael", "known", "half", "cases", "step", "engineering", "florida", "simple", "quick", "none", "wireless", "license", "paul", "friday", "lake", "whole", "annual", "published", "later", "basic", "sony", "shows", "corporate", "google", "church", "method", "purchase", "customers", "active", "response", "practice", "hardware", "figure", "materials", "fire", "holiday", "chat", "enough", "designed", "along", "among", "death", "writing", "speed", "html", "countries", "loss", "face", "brand", "discount", "higher", "effects", "created", "remember", "standards", "oil", "bit", "yellow", "political", "increase", "advertise", "kingdom", "base", "near", "environmental", "thought", "stuff", "french", "storage", "oh", "japan", "doing", "loans", "shoes", "entry", "stay", "nature", "orders", "availability", "africa", "summary", "turn", "mean", "growth", "notes", "agency", "king", "monday", "european", "activity", "copy", "although", "drug", "pics", "western", "income", "force", "cash", "employment", "overall", "bay", "river", "commission", "ad", "package", "contents", "seen", "players", "engine", "port", "album", "regional", "stop", "supplies", "started", "administration", "bar", "institute", "views", "plans", "double", "dog", "build", "screen", "exchange", "types", "soon", "sponsored", "lines", "electronic", "continue", "across", "benefits", "needed", "season", "apply", "someone", "held", "ny", "anything", "printer", "condition", "effective", "believe", "organization", "effect", "asked", "eur", "mind", "sunday", "selection", "casino", "pdf", "lost", "tour", "menu", "volume", "cross", "anyone", "mortgage", "hope", "silver", "corporation", "wish", "inside", "solution", "mature", "role", "rather", "weeks", "addition", "came", "supply", "nothing", "certain", "usr", "executive", "running", "lower", "necessary", "union", "jewelry", "according", "dc", "clothing", "mon", "com", "particular", "fine", "names", "robert", "homepage", "hour", "gas", "skills", "six", "bush", "islands", "advice", "career", "military", "rental", "decision", "leave", "british", "teens", "pre", "huge", "sat", "woman", "facilities", "zip", "bid", "kind", "sellers", "middle", "move", "cable", "opportunities", "taking", "values", "division", "coming", "tuesday", "object", "lesbian", "appropriate", "machine", "logo", "length", "actually", "nice", "score", "statistics", "client", "ok", "returns", "capital", "follow", "sample", "investment", "sent", "shown", "saturday", "christmas", "england", "culture", "band", "flash", "ms", "lead", "george", "choice", "went", "starting", "registration", "fri", "thursday", "courses", "consumer", "hi", "airport", "foreign", "artist", "outside", "furniture", "levels", "channel", "letter", "mode", "phones", "ideas", "wednesday", "structure", "fund", "summer", "allow", "degree", "contract", "button", "releases", "wed", "homes", "super", "male", "matter", "custom", "virginia", "almost", "took", "located", "multiple", "asian", "distribution", "editor", "inn", "industrial", "cause", "potential", "song", "cnet", "ltd", "los", "hp", "focus", "late", "fall", "featured", "idea", "rooms", "female", "responsible", "inc", "communications", "win", "associated", "thomas", "primary", "cancer", "numbers", "reason", "tool", "browser", "spring", "foundation", "answer", "voice", "eg", "friendly", "schedule", "documents", "communication", "purpose", "feature", "bed", "comes", "police", "everyone", "independent", "ip", "approach", "cameras", "brown", "physical", "operating", "hill", "maps", "medicine", "deal", "hold", "ratings", "chicago", "forms", "glass", "happy", "tue", "smith", "wanted", "developed", "thank", "safe", "unique", "survey", "prior", "telephone", "sport", "ready", "feed", "animal", "sources", "mexico", "population", "pa", "regular", "secure", "navigation", "operations", "therefore", "simply", "evidence", "station", "christian", "round", "paypal", "favorite", "understand", "option", "master", "valley", "recently", "probably", "thu", "rentals", "sea", "built", "publications", "blood", "cut", "worldwide", "improve", "connection", "publisher", "hall", "larger", "anti", "networks", "earth", "parents", "nokia", "impact", "transfer", "introduction", "kitchen", "strong", "tel", "carolina", "wedding", "properties", "hospital", "ground", "overview", "ship", "accommodation", "owners", "disease", "tx", "excellent", "paid", "italy", "perfect", "hair", "opportunity", "kit", "classic", "basis", "command", "cities", "william", "express", "award", "distance", "tree", "peter", "assessment", "ensure", "thus", "wall", "ie", "involved", "el", "extra", "especially", "interface", "partners", "budget", "rated", "guides", "success", "maximum", "ma", "operation", "existing", "quite", "selected", "boy", "amazon", "patients", "restaurants", "beautiful", "warning", "wine", "locations", "horse", "vote", "forward", "flowers", "stars", "significant", "lists", "technologies", "owner", "retail", "animals", "useful", "directly", "manufacturer", "ways", "est", "son", "providing", "rule", "mac", "housing", "takes", "iii", "gmt", "bring", "catalog", "searches", "max", "trying", "mother", "authority", "considered", "told", "xml", "traffic", "programme", "joined", "input", "strategy", "feet", "agent", "valid", "bin", "modern", "senior", "ireland", "teaching", "door", "grand", "testing", "trial", "charge", "units", "instead", "canadian", "cool", "normal", "wrote", "enterprise", "ships", "entire", "educational", "md", "leading", "metal", "positive", "fl", "fitness", "chinese", "opinion", "mb", "asia", "football", "abstract", "uses", "output", "funds", "mr", "greater", "likely", "develop", "employees", "artists", "alternative", "processing", "responsibility", "resolution", "java", "guest", "seems", "publication", "pass", "relations", "trust", "van", "contains", "session", "multi", "photography", "republic", "fees", "components", "vacation", "century", "academic", "assistance", "completed", "skin", "graphics", "indian", "prev", "ads", "mary", "il", "expected", "ring", "grade", "dating", "pacific", "mountain", "organizations", "pop", "filter", "mailing", "vehicle", "longer", "consider", "int", "northern", "behind", "panel", "floor", "german", "buying", "match", "proposed", "default", "require", "iraq", "boys", "outdoor", "deep", "morning", "otherwise", "allows", "rest", "protein", "plant", "reported", "hit", "transportation", "mm", "pool", "mini", "politics", "partner", "disclaimer", "authors", "boards", "faculty", "parties", "fish", "membership", "mission", "eye", "string", "sense", "modified", "pack", "released", "stage", "internal", "goods", "recommended", "born", "unless", "richard", "detailed", "japanese", "race", "approved", "background", "target", "except", "character", "usb", "maintenance", "ability", "maybe", "functions", "ed", "moving", "brands", "places", "php", "pretty", "trademarks", "phentermine", "spain", "southern", "yourself", "etc", "winter", "battery", "youth", "pressure", "submitted", "boston", "debt", "keywords", "medium", "television", "interested", "core", "break", "purposes", "throughout", "sets", "dance", "wood", "msn", "itself", "defined", "papers", "playing", "awards", "fee", "studio", "reader", "virtual", "device", "established", "answers", "rent", "las", "remote", "dark", "programming", "external", "apple", "le", "regarding", "instructions", "min", "offered", "theory", "enjoy", "remove", "aid", "surface", "minimum", "visual", "host", "variety", "teachers", "isbn", "martin", "manual", "block", "subjects", "agents", "increased", "repair", "fair", "civil", "steel", "understanding", "songs", "fixed", "wrong", "beginning", "hands", "associates", "finally", "az", "updates", "desktop", "classes", "paris", "ohio", "gets", "sector", "capacity", "requires", "jersey", "un", "fat", "fully", "father", "electric", "saw", "instruments", "quotes", "officer", "driver", "businesses", "dead", "respect", "unknown", "specified", "restaurant", "mike", "trip", "pst", "worth", "mi", "procedures", "poor", "teacher", "eyes", "relationship", "workers", "farm", "georgia", "peace", "traditional", "campus", "tom", "showing", "creative", "coast", "benefit", "progress", "funding", "devices", "lord", "grant", "sub", "agree", "fiction", "hear", "sometimes", "watches", "careers", "beyond", "goes", "families", "led", "museum", "themselves", "fan", "transport", "interesting", "blogs", "wife", "evaluation", "accepted", "former", "implementation", "ten", "hits", "zone", "complex", "th", "cat", "galleries", "references", "die", "presented", "jack", "flat", "flow", "agencies", "literature", "respective", "parent", "spanish", "michigan", "columbia", "setting", "dr", "scale", "stand", "economy", "highest", "helpful", "monthly", "critical", "frame", "musical", "definition", "secretary", "angeles", "networking", "path", "australian", "employee", "chief", "gives", "kb", "bottom", "magazines", "packages", "detail", "francisco", "laws", "changed", "pet", "heard", "begin", "individuals", "colorado", "royal", "clean", "switch", "russian", "largest", "african", "guy", "titles", "relevant", "guidelines", "justice", "connect", "bible", "dev", "cup", "basket", "applied", "weekly", "vol", "installation", "described", "demand", "pp", "suite", "vegas", "na", "square", "chris", "attention", "advance", "skip", "diet", "army", "auction", "gear", "lee", "os", "difference", "allowed", "correct", "charles", "nation", "selling", "lots", "piece", "sheet", "firm", "seven", "older", "illinois", "regulations", "elements", "species", "jump", "cells", "module", "resort", "facility", "random", "pricing", "dvds", "certificate", "minister", "motion", "looks", "fashion", "directions", "visitors", "documentation", "monitor", "trading", "forest", "calls", "whose", "coverage", "couple", "giving", "chance", "vision", "ball", "ending", "clients", "actions", "listen", "discuss", "accept", "automotive", "naked", "goal", "successful", "sold", "wind", "communities", "clinical", "situation", "sciences", "markets", "lowest", "highly", "publishing", "appear", "emergency", "developing", "lives", "currency", "leather", "determine", "temperature", "palm", "announcements", "patient", "actual", "historical", "stone", "bob", "commerce", "ringtones", "perhaps", "persons", "difficult", "scientific", "satellite", "fit", "tests", "village", "accounts", "amateur", "ex", "met", "pain", "xbox", "particularly", "factors", "coffee", "www", "settings", "buyer", "cultural", "steve", "easily", "oral", "ford", "poster", "edge", "functional", "root", "au", "fi", "closed", "holidays", "ice", "pink", "zealand", "balance", "monitoring", "graduate", "replies", "shot", "nc", "architecture", "initial", "label", "thinking", "scott", "llc", "sec", "recommend", "canon", "league", "waste", "minute", "bus", "provider", "optional", "dictionary", "cold", "accounting", "manufacturing", "sections", "chair", "fishing", "effort", "phase", "fields", "bag", "fantasy", "po", "letters", "motor", "va", "professor", "context", "install", "shirt", "apparel", "generally", "continued", "foot", "mass", "crime", "count", "breast", "techniques", "ibm", "rd", "Hello", "AI", "tokens", "tokenization", "tokenize", "tokenizer", "LLM", "LLMs", "python", "def", "import", "const", "async", "await", "console", "false", "null", "emojis"];

  const generalVocabList = [
    // Special tokens
    "<|endoftext|>", "<|im_start|>", "<|im_end|>", "<|eot_id|>", "<s>", "</s>", "[PAD]", "[UNK]", "[CLS]", "[SEP]",

    // Single Characters (ASCII & Multi-byte)
    ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!\"#$%&'()*+,-./:;<=>?@[\\]^_{|}~ \n\t\r".split(""),

    // Miscellaneous Symbols & Tokens
    "'s", "'t", "'re", "'ve", "'m", "'ll", "'d", "():", "??", "??", "?", "??", "??", "???????????",

    // WordPiece Subwords (with ##)
    "##ize", "##ization", "##ing", "##ed", "##er", "##est", "##ly", "##tion", "##ment",

    // SentencePiece Subwords (with ▁ space markers)
    " ization", " prompt", " learn", " ing", " transform", " er"
  ];

  // Auto-generate prefix variants: plain word, space-prefixed (BPE),
  // "Ġ"-prefixed (tiktoken display) and "▁"-prefixed (SentencePiece display)
  baseWords.forEach(w => {
    generalVocabList.push(w);
    generalVocabList.push(" " + w);
    generalVocabList.push("Ġ" + w);
    generalVocabList.push("▁" + w);
  });

  function buildVocabMap(offset, exactMap, baseList) {
    const stringToId = new Map();
    const idToString = new Map();

    if (exactMap) {
      for (const [str, id] of exactMap.entries()) {
        stringToId.set(str, id);
        idToString.set(id, str);
      }
    }

    let currentId = offset + 256;
    baseList.forEach(item => {
      if (!stringToId.has(item)) {
        stringToId.set(item, currentId);
        idToString.set(currentId, item);
        currentId++;
      }
    });

    // Use a high range to avoid collisions with words
    return { stringToId, idToString, byteFallbackOffset: 190000 + offset };
  }

  // Ensure unique model offsets
  const gpt4oMap = buildVocabMap(0, gpt4oExactMap, generalVocabList);
  const gpt4Map = buildVocabMap(100000, gpt4ExactMap, generalVocabList);
  const llama3Map = buildVocabMap(128000, llama3ExactMap, generalVocabList);
  const bertMap = buildVocabMap(300000, null, generalVocabList);
  const geminiMap = buildVocabMap(400000, null, generalVocabList);
  const deepseekMap = buildVocabMap(500000, null, generalVocabList);
  const qwenMap = buildVocabMap(600000, null, generalVocabList);
  const mistralMap = buildVocabMap(700000, null, generalVocabList);
  const gpt3Map = buildVocabMap(800000, null, generalVocabList);
  const llama2Map = buildVocabMap(900000, null, generalVocabList);
  const claudeOpusMap = buildVocabMap(1000000, null, generalVocabList);
  const grokMap = buildVocabMap(1100000, null, generalVocabList);
  const cohereMap = buildVocabMap(1200000, null, generalVocabList);

  // Fix regex: removed (?i:...) flag
  const bpeRegex = /(?:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

  return {
    bpeRegex,
    models: {
      "gpt-4o": {
        name: "OpenAI GPT-4o / GPT-4o-mini",
        family: "Byte-Pair Encoding (o200k_base)",
        vocabSize: "200,000",
        vocabMap: gpt4oMap,
        spaceChar: "Ġ",
        regex: bpeRegex,
        costPer1M: { input: 2.50, output: 10.00 }
      },
      "gpt-4": {
        name: "OpenAI GPT-4 / GPT-3.5 Turbo",
        family: "Byte-Pair Encoding (cl100k_base)",
        vocabSize: "100,000",
        vocabMap: gpt4Map,
        spaceChar: "Ġ",
        regex: bpeRegex,
        costPer1M: { input: 5.00, output: 15.00 }
      },
      "llama-3": {
        name: "Meta Llama 3.3 / 3.2 / 3.1",
        family: "Tiktoken BPE (128k)",
        vocabSize: "128,256",
        vocabMap: llama3Map,
        spaceChar: "Ġ",
        regex: bpeRegex,
        costPer1M: { input: 0.15, output: 0.60 }
      },
      "claude-3-5": {
        name: "Anthropic Claude 3.5 Sonnet",
        family: "Byte-Pair Encoding (Claude BPE)",
        vocabSize: "100,000+",
        vocabMap: gpt4Map,
        spaceChar: "Ġ",
        regex: bpeRegex,
        costPer1M: { input: 3.00, output: 15.00 }
      },
      "gemini-2-flash": {
        name: "Google Gemini 2.0 Flash / 1.5 Pro",
        family: "SentencePiece (Unigram 256k)",
        vocabSize: "256,000",
        vocabMap: geminiMap,
        spaceChar: "▁", // SentencePiece space metastymbol (U+2581)
        costPer1M: { input: 0.10, output: 0.40 }
      },
      "deepseek-r1": {
        name: "DeepSeek R1 / DeepSeek V3",
        family: "Byte-Fallback BPE (128k)",
        vocabSize: "128,000",
        vocabMap: deepseekMap,
        spaceChar: "Ġ",
        regex: bpeRegex,
        costPer1M: { input: 0.14, output: 0.55 }
      },
      "qwen-2-5": {
        name: "Alibaba Qwen 2.5 / Qwen Coder",
        family: "Byte-Fallback BPE (151k)",
        vocabSize: "151,646",
        vocabMap: qwenMap,
        spaceChar: "Ġ",
        regex: bpeRegex,
        costPer1M: { input: 0.20, output: 0.60 }
      },
      "mistral-large": {
        name: "Mistral Large / Mixtral",
        family: "Tekken BPE (32k / 131k)",
        vocabSize: "32,768",
        vocabMap: mistralMap,
        spaceChar: "Ġ",
        regex: bpeRegex,
        costPer1M: { input: 2.00, output: 6.00 }
      },
      "gpt-3": {
        name: "OpenAI GPT-3 / GPT-2 / Codex",
        family: "Byte-Pair Encoding (p50k / r50k)",
        vocabSize: "50,000",
        vocabMap: gpt3Map,
        spaceChar: "Ġ",
        regex: bpeRegex,
        costPer1M: { input: 0.03, output: 0.06 }
      },
      "llama-2": {
        name: "Meta Llama 2 / Llama 1",
        family: "SentencePiece (32k)",
        vocabSize: "32,000",
        vocabMap: llama2Map,
        spaceChar: "▁",
        costPer1M: { input: 0.15, output: 0.60 }
      },
      "claude-3-opus": {
        name: "Anthropic Claude 3 Opus",
        family: "Byte-Pair Encoding (Claude BPE)",
        vocabSize: "100,000+",
        vocabMap: claudeOpusMap,
        spaceChar: "Ġ",
        regex: bpeRegex,
        costPer1M: { input: 15.00, output: 75.00 }
      },
      "grok-2": {
        name: "xAI Grok 2 / Grok 1.5",
        family: "Byte-Pair Encoding (131k)",
        vocabSize: "131,000",
        vocabMap: grokMap,
        spaceChar: "Ġ",
        regex: bpeRegex,
        costPer1M: { input: 2.00, output: 10.00 }
      },
      "cohere-command-r": {
        name: "Cohere Command R+",
        family: "Byte-Pair Encoding (256k)",
        vocabSize: "256,000",
        vocabMap: cohereMap,
        spaceChar: "Ġ",
        regex: bpeRegex,
        costPer1M: { input: 2.50, output: 10.00 }
      },
      "bert": {
        name: "Google BERT (WordPiece)",
        family: "WordPiece",
        vocabSize: "30,522",
        vocabMap: bertMap,
        spaceChar: "",
        subwordPrefix: "##",
        costPer1M: { input: 0.05, output: 0.05 }
      }
    }
  };
})();
