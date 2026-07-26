# Using Gemma 4: Participant Guide

**Build with Gemma: GDGoC Aberdeen**

This guide covers every practical way to get Gemma 4 running, from zero-setup web access through to downloading the weights and running them on your own laptop. Pick one method, get a "hello world" response working in the first 20 minutes, then build.

Everything here is about access and setup only. Rules, tracks, judging and prizes are covered in the separate hackathon documents.

---

## Contents

1. [Which method should I use?](#1-which-method-should-i-use)
2. [The Gemma 4 model family](#2-the-gemma-4-model-family)
3. [Method A: Google AI Studio (zero setup)](#3-method-a-google-ai-studio-zero-setup)
4. [Method B: Gemini API (hosted Gemma, API key)](#4-method-b-gemini-api-hosted-gemma-api-key)
5. [Method C: Kaggle Notebooks (free GPUs)](#5-method-c-kaggle-notebooks-free-gpus)
6. [Method D: Hugging Face (download the weights)](#6-method-d-hugging-face-download-the-weights)
7. [Method E: Ollama and LM Studio (local, no Python)](#7-method-e-ollama-and-lm-studio-local-no-python)
8. [Rate limits on hosted access](#8-rate-limits-on-hosted-access)
9. [Local hardware requirements and limitations](#9-local-hardware-requirements-and-limitations)
10. [Prompting and configuration notes](#10-prompting-and-configuration-notes)
11. [Troubleshooting](#11-troubleshooting)
12. [Official links](#12-official-links)

---

## 1. Which method should I use?

| Your situation | Use this | Setup time |
|---|---|---|
| No GPU, want to ship fast, need a web app or API backend | **Gemini API** (Method B) | ~5 min |
| Just want to test prompts and get a feel for the model | **AI Studio** (Method A) | ~1 min |
| Need a GPU for fine-tuning or heavy batch work | **Kaggle Notebooks** (Method C) | ~10 min |
| Custom inference code, fine-tuning, full control | **Hugging Face** (Method D) | ~20 min |
| Want offline or on-device inference | **Ollama or LM Studio** (Method E) | ~10 min + download |

> **Important:** your project must integrate Gemma 4, not Gemini. If you call the Gemini API, make sure the model string is a `gemma-4-*` model. Judges will look for this.

---

## 2. The Gemma 4 model family

Gemma 4 is Google DeepMind's open-weights family, released under the **Apache 2.0 licence**, with open weights on Kaggle and Hugging Face. Models are multimodal (text and image input across the family, audio natively on E2B, E4B and 12B) and generate text output.

| Model | Architecture | Context | Modalities | Best for |
|---|---|---|---|---|
| **E2B** | Small, edge ("effective" 2B) | 128K | Text, Image, Audio | Phones, browsers, very light laptops |
| **E4B** | Small, edge ("effective" 4B) | 128K | Text, Image, Audio | Solid default for local laptop use |
| **12B** | Unified (encoder-free multimodal) | 256K | Text, Image, Audio | Balanced local workstation model |
| **26B A4B** | Mixture-of-Experts (~3.8B active) | 256K | Text, Image | High-throughput reasoning |
| **31B** | Dense | 256K | Text, Image | Highest quality, server or strong GPU |

Other capabilities:

- **Configurable thinking modes.** All models can reason step-by-step internally before answering.
- **Native function calling.** Useful if your app needs the model to call out to your own code, query an API, or write to a database.
- **Native `system` role support.** Unlike Gemma 3, you can set behaviour with a proper system prompt.
- **Multi-Token Prediction (MTP) drafters.** Every size ships with a matching draft model for speculative decoding, which speeds up generation with no quality loss.
- **Multilingual.** 140+ languages.

Naming: `-it` suffix means instruction-tuned (what you almost certainly want). No suffix means pre-trained base weights.

---

## 3. Method A: Google AI Studio (zero setup)

Best for sanity-checking prompts, exploring multimodal input, and deciding how you want the model to behave before you write code.

### Steps

1. Go to **<https://aistudio.google.com>** and sign in with a Google account.
2. Open the model picker in the top right and select a **Gemma 4** model (e.g. `gemma-4-31b-it` or `gemma-4-26b-a4b-it`).
3. Type a prompt into the chat panel and press **Run**.
4. Use the right-hand panel to set your **system instruction**, temperature, and thinking level.
5. Drag an image into the prompt box to test multimodal behaviour.
6. When you have a prompt you like, click **Get code** to export it as Python, JavaScript or cURL. This is your bridge into Method B.

### Notes

- AI Studio and the API have **separate quotas**, so heavy prompt testing in the UI does not eat your app's API budget.
- AI Studio's free usage may be used to improve Google's products. Don't paste anything sensitive.
- You can also try edge models through the **Google AI Edge Gallery** app if you want to demo on-device on a phone.

---

## 4. Method B: Gemini API (hosted Gemma, API key)

Best for almost any web app. No GPU, no download, no cold start.

The Gemini API hosts a subset of Gemma 4:

- `gemma-4-31b-it`
- `gemma-4-26b-a4b-it`

### Step 1: Get an API key

1. Go to **<https://aistudio.google.com/apikey>**.
2. Click **Create API key** and copy it.
3. Store it in an environment variable, **never** in committed code:
   ```bash
   export GEMINI_API_KEY="your-key-here"
   ```
   Add `.env` to your `.gitignore` before your first commit. Your repo has to be public for submission, and leaked keys get auto-revoked.

### Step 2: Install the SDK

```bash
pip install google-genai        # Python
npm install @google/genai       # JavaScript
```

### Step 3: Make your first call

**Python**

```python
from google import genai

client = genai.Client()   # reads GEMINI_API_KEY from the environment

response = client.models.generate_content(
    model="gemma-4-26b-a4b-it",
    contents="Explain what a mixture-of-experts model is, in two sentences.",
)

print(response.text)
```

**JavaScript**

```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI();

const response = await ai.models.generateContent({
  model: "gemma-4-26b-a4b-it",
  contents: "Explain what a mixture-of-experts model is, in two sentences.",
});
console.log(response.text);
```

**cURL**

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent" \
  -H 'Content-Type: application/json' \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -X POST \
  -d '{"contents":[{"parts":[{"text":"Roses are red..."}]}]}'
```

### Step 4: Add a system instruction

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemma-4-26b-a4b-it",
    config=types.GenerateContentConfig(
        system_instruction=(
            "You are a terse technical assistant. Answer in at most three sentences. "
            "If the question is ambiguous, ask one clarifying question instead of guessing."
        )
    ),
    contents="What is the difference between top_p and top_k sampling?",
)
print(response.text)
```

### Step 5: Turn on thinking (optional)

Gemma 4 supports an internal reasoning process, toggled on or off. Via the API you enable it by setting the thinking level to `"high"`:

```python
response = client.models.generate_content(
    model="gemma-4-26b-a4b-it",
    contents="Five tasks have durations 3, 1, 4, 1, 5 and deadlines 4, 2, 8, 3, 9. Order them to minimise lateness.",
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_level="high")
    ),
)
```

Thinking costs latency and tokens. Use it for planning and scheduling logic, and turn it off for chat replies and UI copy.

### Step 6: Multi-turn chat

The SDK tracks history for you:

```python
chat = client.chats.create(model="gemma-4-26b-a4b-it")
print(chat.send_message("Name three common causes of a CUDA out-of-memory error.").text)
print(chat.send_message("Which of those is easiest to fix?").text)
```

### Step 7: Images, function calling, search grounding

- **Images.** Upload with `client.files.upload(file="photo.jpg")` and pass the file object alongside your text prompt. Useful for anything that takes a photo or screenshot as input.
- **Function calling.** Pass `tools=[types.Tool(function_declarations=[...])]` in the config and the model returns a structured call instead of text. This is the cleanest way to let Gemma take actions in your app rather than only producing prose.
- **Google Search grounding.** Pass `tools=[{"google_search": {}}]` to ground answers in live web results, with citations available in `grounding_metadata`.

Full code for all three: <https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api>

---

## 5. Method C: Kaggle Notebooks (free GPUs)

Best for fine-tuning, running the larger open weights, or anything that needs a GPU you don't own. Also convenient because your submission can attach a Kaggle Notebook as the live demo.

### Steps

1. Go to **<https://www.kaggle.com/code>** and click **New Notebook**.
2. **Verify your phone number** in Kaggle account settings. Accelerators are locked until you do, and verification can take a few minutes to process.
3. In the right-hand sidebar, open **Session options > Accelerator** and pick a GPU (T4 x2 or P100, depending on availability).
4. Turn **Internet** on in the same panel, otherwise `pip install` and model downloads will fail.
5. Add the model via **Add Input > Models > search `gemma-4`**, or download from Hugging Face inside the notebook.
6. Install and run:
   ```python
   !pip install -q -U transformers accelerate
   from transformers import pipeline

   pipe = pipeline("text-generation", model="google/gemma-4-E4B-it", device_map="auto")
   print(pipe("Explain quantisation in two sentences.", max_new_tokens=200)[0]["generated_text"])
   ```

### Kaggle limits to plan around

- GPU quota is **roughly 30 hours per week**, shared across all your notebooks, so don't leave idle sessions running.
- A single interactive session times out after a few hours. Commits (batch runs) have their own limit, typically up to 9 to 12 hours.
- Disk and RAM are finite. A 31B model at full precision will not fit, so use a smaller size or a quantised checkpoint.
- Store your API keys in **Add-ons > Secrets**, not in cell code.
- A private notebook attached to a submission becomes **public after the deadline**, so assume everything in it is visible.

Kaggle docs: <https://www.kaggle.com/docs/notebooks>

---

## 6. Method D: Hugging Face (download the weights)

Best for full control, custom pipelines, fine-tuning with LoRA or QLoRA, or running on your own GPU.

### Step 1: Set up

```bash
pip install -U transformers accelerate torch
pip install -U huggingface_hub
huggingface-cli login     # paste an access token from huggingface.co/settings/tokens
```

### Step 2: Pick a checkpoint

The official collection is at **<https://huggingface.co/collections/google/gemma-4>**. Repository names follow the pattern:

```
google/gemma-4-E2B-it
google/gemma-4-E4B-it
google/gemma-4-12B-it
google/gemma-4-26B-A4B-it
google/gemma-4-31B-it
```

For low-memory machines, use the **QAT (quantization-aware training)** checkpoints instead. They are trained to tolerate 4-bit compression, so quality holds up far better than naively quantising afterwards:

| Target | Download suffix |
|---|---|
| llama.cpp or LM Studio | `{model}-qat-q4_0-gguf` |
| vLLM or SGLang (server) | `{model}-qat-w4a16-ct` |
| Speculative decoding | `{model}-qat-q4_0-unquantized` plus `-assistant` drafter |
| Mobile | `{model}-qat-mobile-transformers` |

QAT collections: <https://huggingface.co/collections/google/gemma-4-qat-q4-0>

### Step 3: Run inference

```python
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

model_id = "google/gemma-4-E4B-it"

tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.bfloat16,
    device_map="auto",
)

messages = [
    {"role": "system", "content": "You are a concise technical assistant."},
    {"role": "user", "content": "What does device_map=\"auto\" actually do?"},
]

inputs = tokenizer.apply_chat_template(
    messages, add_generation_prompt=True, return_tensors="pt"
).to(model.device)

outputs = model.generate(inputs, max_new_tokens=256, temperature=1.0, top_p=0.95, top_k=64)
print(tokenizer.decode(outputs[0][inputs.shape[-1]:], skip_special_tokens=True))
```

Always use `apply_chat_template` rather than hand-writing the prompt format, since it handles the control tokens for you.

### Step 4: Load in 4-bit if memory is tight

```bash
pip install -U bitsandbytes
```

```python
from transformers import BitsAndBytesConfig

quant_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_quant_type="nf4",
)

model = AutoModelForCausalLM.from_pretrained(model_id, quantization_config=quant_config, device_map="auto")
```

### Fine-tuning

Fine-tuning is only worth attempting under time pressure if you have a clean, small dataset ready and are using QLoRA on a small model. Prompt engineering plus RAG gets you most of the way in far less time. If you do want to try it:

- QLoRA guide: <https://ai.google.dev/gemma/docs/core/huggingface_text_finetune_qlora>
- Unsloth (fastest option on a single GPU): <https://unsloth.ai/docs/models/gemma-4/train>

**No GPU of your own?** Use Kaggle Notebooks (Method C). They give you free GPU time, roughly 30 hours a week, which is more than enough for a QLoRA run on E2B or E4B. Attach the model as a notebook input, enable the accelerator and internet, and run the QLoRA guide's code more or less as-is. Budget the hours carefully, because the quota is weekly rather than daily, and a couple of failed runs left training in the background can exhaust it. Save checkpoints to `/kaggle/working/` as you go, since the session will eventually time out and take anything in memory with it.

---

## 7. Method E: Ollama and LM Studio (local, no Python)

Best for offline demos, privacy-angle projects, and having a fallback when the network or your quota dies.

### Ollama (command line plus local HTTP server)

1. Install from **<https://ollama.com/download>**.
2. Pull and run a model:
   ```bash
   ollama run gemma4:e4b      # ~9.6 GB download, 128K context
   ollama run gemma4:e2b      # ~7.2 GB, smallest
   ollama run gemma4:12b      # ~7.6 GB, 256K context
   ollama run gemma4:26b      # ~18 GB, MoE
   ollama run gemma4:31b      # ~20 GB, dense, strongest
   ```
   On Apple Silicon, the `-mlx` tags (e.g. `gemma4:12b-mlx`) are faster.
3. Ollama serves an HTTP API on `http://localhost:11434` automatically:
   ```bash
   curl http://localhost:11434/api/generate -d '{
     "model": "gemma4:e4b",
     "prompt": "List three ways to reduce VRAM usage during inference.",
     "stream": false
   }'
   ```
4. From Python, use the OpenAI-compatible endpoint so you can swap backends easily:
   ```python
   from openai import OpenAI

   client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
   r = client.chat.completions.create(
       model="gemma4:e4b",
       messages=[{"role": "user", "content": "Hello"}],
   )
   print(r.choices[0].message.content)
   ```

Pull models well ahead of when you need them. A 10 to 20 GB download over a slow or shared connection can take a long time, and Ollama will not serve the model until it completes.

### LM Studio (GUI)

1. Install from **<https://lmstudio.ai>**.
2. Search for `gemma 4` in the Discover tab and download a GGUF build. Prefer a `qat-q4_0` variant.
3. Chat in the app, or start the local server (Developer tab) for an OpenAI-compatible endpoint on `http://localhost:1234/v1`.

Official integration docs: [Ollama](https://ai.google.dev/gemma/docs/integrations/ollama), [LM Studio](https://ai.google.dev/gemma/docs/integrations/lmstudio), [llama.cpp](https://ai.google.dev/gemma/docs/integrations/llamacpp), [MLX](https://ai.google.dev/gemma/docs/integrations/mlx)

---

## 8. Rate limits on hosted access

### How the Gemini API measures usage

Limits are enforced across three dimensions simultaneously:

- **RPM**: requests per minute
- **TPM**: input tokens per minute
- **RPD**: requests per day

Exceeding any one of them returns an HTTP **429 / RESOURCE_EXHAUSTED** error, even if you are comfortably inside the other two.

Key mechanics:

- Limits apply **per project, not per API key**. Generating extra keys inside the same project gains you nothing, since they all draw from the same pool.
- **RPD resets at midnight Pacific Time** (08:00 UTC), not on a rolling 24-hour window.
- Enabling billing on a project moves it to Tier 1 and **removes the free tier on that project entirely**, meaning every call bills from the first token. If you want free testing alongside a paid path, use two separate projects.

### What the actual numbers are

Google no longer publishes a fixed public table of per-model limits. They vary by model, usage tier, region and account status, and Google states they aren't guaranteed. Check your live numbers here:

**<https://aistudio.google.com/rate-limit>**

Check this before you start building, so you are planning against your project's real figures. For rough planning on the free tier, expect something in the region of **5 to 15 RPM** and **a few hundred to around 1,000 requests per day** per model, with a generous token-per-minute ceiling. You will almost always hit RPM or RPD before TPM.

### Designing around the limits

An app with a few people testing it and running live demos can burn a free-tier daily quota fast. Things that help:

1. **Cache aggressively.** Store responses keyed on the prompt. During demo rehearsals you will re-run the same input dozens of times.
2. **Retry with exponential backoff** on 429s: 1s, 2s, 4s, 8s. Never retry in a tight loop, since that just burns the quota faster.
   ```python
   import time
   from google.genai import errors

   def generate_with_retry(client, **kwargs):
       for attempt in range(5):
           try:
               return client.models.generate_content(**kwargs)
           except errors.APIError as e:
               if e.code != 429 or attempt == 4:
                   raise
               time.sleep(2 ** attempt)
   ```
3. **Batch your work.** One request that classifies ten items beats ten requests.
4. **Don't call the model on every keystroke.** Debounce UI-triggered calls.
5. **Keep a local fallback.** If your code routes through one `generate()` function, switching to a local Ollama endpoint when you hit 429s is a ten-line change.
6. **Use separate keys per team member during development**, in separate Google Cloud projects, so one person's testing doesn't kill the demo.
7. **Trim your context.** Sending 200K tokens of chat history on every turn eats TPM and adds latency. Summarise old turns.

### Other hosted-access limits

- **Kaggle Notebooks:** around 30 GPU-hours per week per account, sessions time out, phone verification required.
- **Ollama cloud tags** (`gemma4:31b-cloud`) have their own usage tiers on an Ollama account. Useful as an emergency fallback for the big model, but don't build your critical path on it.

---

## 9. Local hardware requirements and limitations

### Memory needed to load the weights

Approximate GPU or TPU memory to hold the static weights, per Google's official figures (includes around 20% loading overhead):

| Model | BF16 (16-bit) | SFP8 (8-bit) | Q4_0 (4-bit) | Mobile | Mobile (text only) |
|---|---|---|---|---|---|
| Gemma 4 E2B | 11.4 GB | 5.7 GB | 2.9 GB | 1.1 GB | 0.84 GB |
| Gemma 4 E4B | 17.9 GB | 8.9 GB | 4.5 GB | 2.5 GB | 2.2 GB |
| Gemma 4 12B | 26.7 GB | 13.4 GB | 6.7 GB | n/a | n/a |
| Gemma 4 26B A4B | 57.7 GB | 28.8 GB | 14.4 GB | n/a | n/a |
| Gemma 4 31B | 69.9 GB | 34.9 GB | 17.5 GB | n/a | n/a |

These are weights only. Add on top:

- **KV cache for your context window.** This grows with prompt and output length and can be substantial at long contexts. If you are running near the memory ceiling, cap your context.
- **Framework and CUDA overhead**, typically a further 1 to 2 GB.
- **Fine-tuning overhead**, which is dramatically higher than inference. Full-precision tuning of anything above E4B is out of reach on consumer hardware, so LoRA or QLoRA is the only realistic route.

### Two architecture quirks worth understanding

- **E2B and E4B.** The "E" means effective parameters. These models use Per-Layer Embeddings, which are large lookup tables that inflate the memory needed to load static weights well above what the effective parameter count suggests. That is why E2B needs 11.4 GB at BF16 despite the "2B" label.
- **26B A4B.** This is a Mixture-of-Experts model. Only around 4B parameters activate per token, so it runs fast, but **all 26B parameters must be resident in memory** for routing. Budget memory like a dense 26B, not a 4B.

### What runs on what

| Your hardware | Realistic choice |
|---|---|
| Laptop, no discrete GPU, 8 GB RAM | E2B at Q4, or just use the hosted API |
| Laptop, 16 GB RAM (CPU only) | E4B at Q4 (~4.5 GB), expect slow generation |
| Apple Silicon M-series, 16 GB unified | E4B or 12B at Q4, via MLX tags, good speed |
| Apple Silicon, 32 GB+ unified | 12B or 26B at Q4 |
| RTX 3060/4060 (8 to 12 GB VRAM) | E4B or 12B at Q4 |
| RTX 4070/4080 (12 to 16 GB VRAM) | 12B at Q4 comfortably, 26B is tight |
| RTX 4090 or A100 (24 GB+) | 31B at Q4, or 12B at higher precision |
| Kaggle T4 x2 or P100 | E4B or 12B, quantise for anything larger |

### Other local constraints to plan for

- **Cold start.** First load reads the whole model from disk into memory, which on a slow SSD is tens of seconds. Keep the server warm during your demo rather than spawning a new process per request.
- **Throughput.** A CPU-only laptop might manage a few tokens per second on E4B. That is fine for a background task and painful for an interactive chat demo. If your UX depends on fast streaming, use the hosted API for the demo.
- **Thermal throttling.** A laptop under sustained inference load will get hot and slow down. Plug in, since battery power caps performance on most machines.
- **Speed up with MTP.** Every Gemma 4 size ships a matching draft model for speculative decoding, which can meaningfully increase tokens per second with no quality loss. Ollama and recent llama.cpp builds support this. See <https://ai.google.dev/gemma/docs/mtp/overview>.

---

## 10. Prompting and configuration notes

Google's recommended sampling settings for Gemma 4, across all use cases:

```
temperature = 1.0
top_p       = 0.95
top_k       = 64
```

Other things that affect output quality:

- **Use the `system` role.** Gemma 4 supports it natively. Put your persona, constraints and output format there rather than repeating them in every user turn.
- **Thinking mode.** Enabled via the API with `thinking_level="high"`. Locally it is triggered by a `<|think|>` token at the start of the system prompt, though Ollama and Transformers' chat template handle this for you. Enable it for planning, scheduling and multi-step reasoning, and disable it for conversational replies.
- **Don't feed thoughts back into history.** In multi-turn conversations, historical assistant messages should contain only the final answer, never the reasoning block. Getting this wrong degrades quality noticeably.
- **Put images and audio before text** in a multimodal prompt.
- **Image token budgets.** Gemma 4 supports configurable visual token budgets of 70, 140, 280, 560 and 1120. Use low budgets for captioning or classification, and high budgets for OCR and reading small text.
- **Structured output.** If you need JSON back, say so explicitly in the system prompt ("respond only with valid JSON, no markdown fences") and parse defensively. Strip stray code fences before `json.loads`.

---

## 11. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `429 RESOURCE_EXHAUSTED` | Rate limit hit. Back off exponentially, check <https://aistudio.google.com/rate-limit>, or switch to a local model. |
| `400 API key not valid` | Key not exported, or exported in a different shell. Echo the env var to check. |
| `404 model not found` | Wrong model string. Hosted Gemma 4 on the Gemini API is `gemma-4-31b-it` or `gemma-4-26b-a4b-it` only. |
| `403` on a Hugging Face download | Not logged in, or token lacks read access. Run `huggingface-cli login`. |
| CUDA out of memory | Use a smaller size, load in 4-bit, or reduce `max_new_tokens` and context length. |
| Kaggle accelerator greyed out | Phone number not verified in account settings. |
| `pip install` fails on Kaggle | Internet toggle is off in Session options. |
| Model output includes stray `<\|...\|>` tokens | You are building the prompt by hand. Use `apply_chat_template`. |
| Ollama very slow | You pulled a model too large for your RAM and it is swapping. Drop to E4B or E2B. |

---

## 12. Official links

**Core documentation**
- [Gemma 4 model overview](https://ai.google.dev/gemma/docs/core)
- [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)
- [Get started](https://ai.google.dev/gemma/docs/get_started)
- [Prompt formatting (Gemma 4)](https://ai.google.dev/gemma/docs/core/prompt-formatting-gemma4)
- [Thinking](https://ai.google.dev/gemma/docs/capabilities/thinking)
- [Function calling](https://ai.google.dev/gemma/docs/capabilities/text/function-calling-gemma4)
- [Vision and image understanding](https://ai.google.dev/gemma/docs/capabilities/vision)
- [Audio](https://ai.google.dev/gemma/docs/capabilities/audio)
- [Multi-Token Prediction](https://ai.google.dev/gemma/docs/mtp/overview)

**Hosted access**
- [Google AI Studio](https://aistudio.google.com)
- [Get an API key](https://aistudio.google.com/apikey)
- [Run Gemma with the Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api)
- [Live rate limits for your project](https://aistudio.google.com/rate-limit)
- [Gemini API rate limits documentation](https://ai.google.dev/gemini-api/docs/rate-limits)

**Weights and downloads**
- [Hugging Face collection](https://huggingface.co/collections/google/gemma-4)
- [QAT (4-bit) collection](https://huggingface.co/collections/google/gemma-4-qat-q4-0)
- [Kaggle Models](https://www.kaggle.com/models?query=gemma-4&publisher=google)

**Local runtimes**
- [Ollama library](https://ollama.com/library/gemma4)
- [Ollama integration guide](https://ai.google.dev/gemma/docs/integrations/ollama)
- [LM Studio integration guide](https://ai.google.dev/gemma/docs/integrations/lmstudio)
- [llama.cpp](https://ai.google.dev/gemma/docs/integrations/llamacpp)
- [MLX (Apple Silicon)](https://ai.google.dev/gemma/docs/integrations/mlx)

**Code and examples**
- [Gemma Cookbook](https://github.com/google-gemma/cookbook)
- [Hugging Face Transformers inference](https://ai.google.dev/gemma/docs/core/huggingface_inference)
- [Keras inference](https://ai.google.dev/gemma/docs/core/keras_inference)
- [QLoRA fine-tuning](https://ai.google.dev/gemma/docs/core/huggingface_text_finetune_qlora)
- [Unsloth (fast fine-tuning)](https://unsloth.ai/docs/models/gemma-4/train)

**Licence and community**
- [Gemma 4 licence (Apache 2.0)](https://ai.google.dev/gemma/apache_2)
- [Prohibited use policy](https://ai.google.dev/gemma/prohibited_use_policy)
- [Model variant naming guidelines](https://ai.google/documents/32/External_Gemma_Model_Variant_Guidelines.pdf)
- [Gemma Discord](https://ai.google.dev/gemma/docs/discord)