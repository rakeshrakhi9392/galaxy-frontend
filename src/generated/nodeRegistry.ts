import type { z } from "zod";
import type { NodeUiConfig } from "@galaxy/schemas";
import {
  getNodeInputSchema,
  getNodeOutputSchema,
  NODE_INPUT_SCHEMAS,
  NODE_OUTPUT_SCHEMAS,
} from "@galaxy/schemas";
import {
  estimateExtractAudioCredits,
  estimateGptImage2Credits,
  estimateKlingV3ProCredits,
  estimateMergeAvCredits,
  estimateMergeVideoCredits,
  estimateOpenRouterLlmCredits,
} from "@galaxy/schemas";

export type {
  HandleDataType,
  NodeUiHandle,
  NodeUiFieldControl,
  NodeUiFieldVisibleWhen,
  NodeUiFieldGroupWhen,
  NodeUiFieldLabelWhen,
  NodeUiFieldPlaceholderWhen,
  NodeUiFieldLayout,
  NodeUiField,
  NodeUiBody,
  NodeUiConfig,
} from "@galaxy/schemas";

export {
  getNodeInputSchema,
  getNodeOutputSchema,
  NODE_INPUT_SCHEMAS,
  NODE_OUTPUT_SCHEMAS,
};

/** UI config slice generated from the backend catalog. */
export type NodeUiDefinition = {
  type: string;
  ui: NodeUiConfig;
};

/** Live credit estimate from resolved node inputs (wired from catalog at build time). */
export type NodeCreditEstimator = (inputs: Record<string, unknown>) => number;

/** Full frontend node definition: UI + shared Zod input/output schemas. */
export type NodeDefinition = NodeUiDefinition & {
  input: z.ZodTypeAny;
  output: z.ZodTypeAny;
  estimateCredits?: NodeCreditEstimator;
};

// AUTO-GENERATED — do not edit. Run: pnpm -C backend generate:nodes
export const nodeDefinitions: NodeUiDefinition[] = [
  {
    "type": "request",
    "ui": {
      "title": "Request-Inputs",
      "description": "Define the input fields for your workflow. These become the request parameters when running via Playground or API.",
      "category": "input",
      "body": "dynamic_fields",
      "handles": [],
      "fields": [],
      "defaults": {
        "label": "Request-Inputs",
        "config": {},
        "inputs": {},
        "dynamicFields": [
          {
            "id": "field_default",
            "name": "Input",
            "type": "text",
            "value": ""
          }
        ]
      }
    }
  },
  {
    "type": "response",
    "ui": {
      "title": "Response",
      "description": "Connect node outputs here to define what your workflow returns. These values appear as results in Playground and API responses.",
      "category": "output",
      "body": "response_bindings",
      "handles": [
        {
          "id": "result",
          "label": "result",
          "kind": "input",
          "dataType": "any"
        }
      ],
      "fields": [],
      "defaults": {
        "label": "Response",
        "config": {},
        "inputs": {}
      }
    }
  },
  {
    "type": "llm",
    "ui": {
      "title": "Gemini Flash Latest",
      "description": "Generate text using Gemini 3.5 Flash via OpenRouter",
      "category": "text",
      "settingsLabel": "Settings",
      "handles": [
        {
          "id": "in:prompt",
          "label": "Prompt",
          "kind": "input",
          "dataType": "text"
        },
        {
          "id": "in:system_prompt",
          "label": "System Prompt",
          "kind": "input",
          "dataType": "text"
        },
        {
          "id": "in:image_urls",
          "label": "Image (Vision)",
          "kind": "input",
          "dataType": "image_list"
        },
        {
          "id": "in:video_urls",
          "label": "Video",
          "kind": "input",
          "dataType": "video_list"
        },
        {
          "id": "in:audio_urls",
          "label": "Audio",
          "kind": "input",
          "dataType": "audio_list"
        },
        {
          "id": "in:temperature",
          "label": "Temperature",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:max_tokens",
          "label": "Max Tokens",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:reasoning",
          "label": "Reasoning",
          "kind": "input",
          "dataType": "boolean"
        },
        {
          "id": "in:top_p",
          "label": "Top P",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:top_k",
          "label": "Top K",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:frequency_penalty",
          "label": "Frequency Penalty",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:presence_penalty",
          "label": "Presence Penalty",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:repetition_penalty",
          "label": "Repetition Penalty",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:min_p",
          "label": "Min P",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:top_a",
          "label": "Top A",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:seed",
          "label": "Seed",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:stop",
          "label": "Stop Sequences",
          "kind": "input",
          "dataType": "text"
        },
        {
          "id": "in:response_format",
          "label": "JSON Mode",
          "kind": "input",
          "dataType": "boolean"
        },
        {
          "id": "out:output",
          "label": "Response",
          "kind": "output",
          "dataType": "text"
        }
      ],
      "fields": [
        {
          "key": "prompt",
          "label": "Prompt",
          "handleId": "in:prompt",
          "control": "textarea",
          "group": "primary",
          "dataType": "text",
          "required": true,
          "placeholder": "Enter your prompt...",
          "helpTooltip": "The main instruction sent to the model."
        },
        {
          "key": "system_prompt",
          "label": "System Prompt",
          "handleId": "in:system_prompt",
          "control": "textarea",
          "group": "primary",
          "dataType": "text",
          "placeholder": "You are a helpful assistant...",
          "helpTooltip": "Optional system message that sets model behavior."
        },
        {
          "key": "image_urls",
          "label": "Image (Vision)",
          "handleId": "in:image_urls",
          "control": "image_upload",
          "layout": "image_upload",
          "group": "primary",
          "dataType": "image_list",
          "handleTop": 12,
          "helpText": "Upload requirements",
          "helpTooltip": "PNG, JPEG, or WebP up to 20MB. Max resolution 1536px."
        },
        {
          "key": "video_urls",
          "label": "Video",
          "handleId": "in:video_urls",
          "control": "image_upload",
          "layout": "image_upload",
          "group": "primary",
          "dataType": "video_list",
          "handleTop": 12
        },
        {
          "key": "audio_urls",
          "label": "Audio",
          "handleId": "in:audio_urls",
          "control": "image_upload",
          "layout": "image_upload",
          "group": "primary",
          "dataType": "audio_list",
          "handleTop": 12
        },
        {
          "key": "temperature",
          "label": "Temperature",
          "handleId": "in:temperature",
          "control": "slider",
          "layout": "slider",
          "group": "advanced",
          "dataType": "number",
          "handleTop": 14,
          "numberMin": 0,
          "numberMax": 2,
          "numberStep": 0.1,
          "resetValue": 0.7,
          "helpTooltip": "Controls randomness. Lower is more focused, higher is more creative."
        },
        {
          "key": "max_tokens",
          "label": "Max Tokens",
          "handleId": "in:max_tokens",
          "control": "number",
          "layout": "inline",
          "group": "advanced",
          "dataType": "number",
          "handleTop": 19,
          "numberMin": 1,
          "numberMax": 8192,
          "numberStep": 1,
          "helpTooltip": "Maximum number of tokens to generate in the response."
        },
        {
          "key": "reasoning",
          "label": "Reasoning",
          "handleId": "in:reasoning",
          "control": "boolean",
          "layout": "inline",
          "group": "advanced",
          "dataType": "boolean",
          "handleTop": 14,
          "handleVariant": "enum",
          "helpTooltip": "Enable extended reasoning when supported by the model."
        },
        {
          "key": "top_p",
          "label": "Top P",
          "handleId": "in:top_p",
          "control": "slider",
          "layout": "slider",
          "group": "advanced",
          "dataType": "number",
          "handleTop": 14,
          "numberMin": 0,
          "numberMax": 1,
          "numberStep": 0.05,
          "resetValue": 1,
          "helpTooltip": "Nucleus sampling threshold. Lower values restrict token choices."
        },
        {
          "key": "top_k",
          "label": "Top K",
          "handleId": "in:top_k",
          "control": "slider",
          "layout": "slider",
          "group": "advanced",
          "dataType": "number",
          "handleTop": 14,
          "numberMin": 0,
          "numberMax": 500,
          "numberStep": 1,
          "resetValue": 0,
          "helpTooltip": "Limits sampling to the top K most likely tokens. 0 disables."
        },
        {
          "key": "frequency_penalty",
          "label": "Frequency Penalty",
          "handleId": "in:frequency_penalty",
          "control": "slider",
          "layout": "slider",
          "group": "advanced",
          "dataType": "number",
          "handleTop": 14,
          "numberMin": -2,
          "numberMax": 2,
          "numberStep": 0.1,
          "resetValue": 0,
          "helpTooltip": "Penalizes tokens based on how often they appear in the text."
        },
        {
          "key": "presence_penalty",
          "label": "Presence Penalty",
          "handleId": "in:presence_penalty",
          "control": "slider",
          "layout": "slider",
          "group": "advanced",
          "dataType": "number",
          "handleTop": 14,
          "numberMin": -2,
          "numberMax": 2,
          "numberStep": 0.1,
          "resetValue": 0,
          "helpTooltip": "Penalizes tokens that have already appeared at least once."
        },
        {
          "key": "repetition_penalty",
          "label": "Repetition Penalty",
          "handleId": "in:repetition_penalty",
          "control": "slider",
          "layout": "slider",
          "group": "advanced",
          "dataType": "number",
          "handleTop": 14,
          "numberMin": 0,
          "numberMax": 2,
          "numberStep": 0.05,
          "resetValue": 1,
          "helpTooltip": "Reduces repetition in generated text."
        },
        {
          "key": "min_p",
          "label": "Min P",
          "handleId": "in:min_p",
          "control": "slider",
          "layout": "slider",
          "group": "advanced",
          "dataType": "number",
          "handleTop": 14,
          "numberMin": 0,
          "numberMax": 1,
          "numberStep": 0.05,
          "resetValue": 0,
          "helpTooltip": "Minimum probability threshold for token sampling."
        },
        {
          "key": "top_a",
          "label": "Top A",
          "handleId": "in:top_a",
          "control": "slider",
          "layout": "slider",
          "group": "advanced",
          "dataType": "number",
          "handleTop": 14,
          "numberMin": 0,
          "numberMax": 1,
          "numberStep": 0.05,
          "resetValue": 0,
          "helpTooltip": "Alternative top-a sampling parameter."
        },
        {
          "key": "seed",
          "label": "Seed",
          "handleId": "in:seed",
          "control": "number",
          "layout": "inline",
          "group": "advanced",
          "dataType": "number",
          "handleTop": 19,
          "numberMin": 0,
          "numberStep": 1,
          "helpTooltip": "Optional seed for reproducible outputs. 0 uses random seed."
        },
        {
          "key": "stop",
          "label": "Stop Sequences",
          "handleId": "in:stop",
          "control": "textarea",
          "group": "advanced",
          "dataType": "text",
          "handleTop": 14,
          "placeholder": "e.g. END, STOP, ###",
          "textareaRows": 2,
          "helpTooltip": "Comma or newline separated sequences that stop generation."
        },
        {
          "key": "response_format",
          "label": "JSON Mode",
          "handleId": "in:response_format",
          "control": "boolean",
          "layout": "inline",
          "group": "advanced",
          "dataType": "boolean",
          "handleTop": 14,
          "handleVariant": "enum",
          "helpTooltip": "When enabled, the model returns valid JSON."
        }
      ],
      "defaults": {
        "label": "Gemini Flash Latest",
        "config": {
          "providers": [
            "openrouter-gemini-2.0-flash-exp-free"
          ],
          "model": "google/gemini-3.5-flash",
          "timeoutMs": 120000,
          "retryPerProvider": 2
        },
        "inputs": {
          "prompt": "",
          "system_prompt": "",
          "image_urls": [],
          "video_urls": [],
          "audio_urls": [],
          "temperature": 0.7,
          "max_tokens": 1024,
          "reasoning": false,
          "top_p": 1,
          "top_k": 0,
          "frequency_penalty": 0,
          "presence_penalty": 0,
          "repetition_penalty": 1,
          "min_p": 0,
          "top_a": 0,
          "seed": 0,
          "stop": "",
          "response_format": false
        },
        "settingsOpen": false
      },
      "pricing": {
        "estimateCredits": 102
      }
    }
  },
  {
    "type": "gpt-image-2",
    "ui": {
      "title": "GPT Image 2",
      "description": "OpenAI's newest image model with any-resolution support and improved quality",
      "category": "image",
      "handles": [
        {
          "id": "in:prompt",
          "label": "Prompt",
          "kind": "input",
          "dataType": "text"
        },
        {
          "id": "in:image",
          "label": "Input Images",
          "kind": "input",
          "dataType": "image"
        },
        {
          "id": "in:size",
          "label": "Size",
          "kind": "input",
          "dataType": "enum"
        },
        {
          "id": "in:quality",
          "label": "Quality",
          "kind": "input",
          "dataType": "enum"
        },
        {
          "id": "in:n",
          "label": "Number of Images",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:background",
          "label": "Background",
          "kind": "input",
          "dataType": "enum"
        },
        {
          "id": "in:output_format",
          "label": "Output Format",
          "kind": "input",
          "dataType": "enum"
        },
        {
          "id": "out:result",
          "label": "Generated Images",
          "kind": "output",
          "dataType": "image_list"
        }
      ],
      "settingsLabel": "Settings",
      "fields": [
        {
          "key": "mode",
          "label": "Mode",
          "control": "mode_tabs",
          "group": "primary",
          "dataType": "enum",
          "optionsKey": "GPT_IMAGE_2_MODE_OPTIONS"
        },
        {
          "key": "image",
          "label": "Input Images",
          "handleId": "in:image",
          "control": "image_upload",
          "layout": "image_upload",
          "group": "primary",
          "dataType": "image",
          "required": true,
          "handleTop": 12,
          "handleVariant": "number",
          "helpText": "Upload requirements",
          "helpTooltip": "PNG, JPEG, or WebP up to 20MB. Max resolution 3840px.",
          "visibleWhen": {
            "key": "mode",
            "in": [
              "image_to_image"
            ]
          }
        },
        {
          "key": "prompt",
          "label": "Prompt",
          "handleId": "in:prompt",
          "control": "textarea",
          "group": "primary",
          "dataType": "text",
          "required": true,
          "placeholder": "Describe the image you want to create...",
          "maxLength": 4000
        },
        {
          "key": "size",
          "label": "Size",
          "handleId": "in:size",
          "control": "select",
          "group": "primary",
          "dataType": "enum",
          "optionsKey": "GPT_IMAGE_2_SIZE_OPTIONS",
          "layout": "select_primary",
          "handleVariant": "text"
        },
        {
          "key": "quality",
          "label": "Quality",
          "handleId": "in:quality",
          "control": "select",
          "group": "primary",
          "dataType": "enum",
          "optionsKey": "GPT_IMAGE_2_QUALITY_OPTIONS",
          "layout": "inline",
          "handleTop": 20,
          "handleVariant": "text"
        },
        {
          "key": "n",
          "label": "Number of Images",
          "handleId": "in:n",
          "control": "select",
          "group": "primary",
          "dataType": "number",
          "optionsKey": "GPT_IMAGE_2_COUNT_OPTIONS",
          "layout": "inline",
          "handleTop": 20
        },
        {
          "key": "background",
          "label": "Background",
          "handleId": "in:background",
          "control": "select",
          "group": "advanced",
          "dataType": "enum",
          "optionsKey": "GPT_IMAGE_2_BACKGROUND_OPTIONS",
          "layout": "inline",
          "handleTop": 20,
          "handleVariant": "text"
        },
        {
          "key": "output_format",
          "label": "Output Format",
          "handleId": "in:output_format",
          "control": "select",
          "group": "advanced",
          "dataType": "enum",
          "optionsKey": "GPT_IMAGE_2_OUTPUT_FORMAT_OPTIONS",
          "layout": "inline",
          "handleTop": 20,
          "handleVariant": "text"
        }
      ],
      "defaults": {
        "label": "GPT Image 2",
        "config": {
          "providers": [
            "openai-gpt-image-2-stub"
          ],
          "timeoutMs": 120000,
          "retryPerProvider": 2
        },
        "inputs": {
          "mode": "text_to_image",
          "prompt": "",
          "image": "",
          "size": "auto",
          "quality": "high",
          "n": 1,
          "output_format": "png",
          "background": "auto"
        },
        "settingsOpen": false
      },
      "pricing": {
        "estimateCredits": 210000,
        "description": "Estimated credits based on quality and number of images"
      }
    }
  },
  {
    "type": "kling-v3-pro",
    "ui": {
      "title": "Kling v3 Pro",
      "description": "Premium Kling v3 Pro model with top-tier video quality and advanced prompt adherence.",
      "category": "video",
      "settingsLabel": "Settings",
      "handles": [
        {
          "id": "in:mode",
          "label": "Mode",
          "kind": "input",
          "dataType": "enum"
        },
        {
          "id": "in:start_image_url",
          "label": "Start Frame",
          "kind": "input",
          "dataType": "image"
        },
        {
          "id": "in:end_image_url",
          "label": "End Frame",
          "kind": "input",
          "dataType": "image"
        },
        {
          "id": "in:prompt",
          "label": "Prompt",
          "kind": "input",
          "dataType": "text"
        },
        {
          "id": "in:aspect_ratio",
          "label": "Aspect Ratio",
          "kind": "input",
          "dataType": "enum"
        },
        {
          "id": "in:duration",
          "label": "Duration",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:negative_prompt",
          "label": "Negative Prompt",
          "kind": "input",
          "dataType": "text"
        },
        {
          "id": "in:cfg_scale",
          "label": "CFG Scale",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "in:generate_audio",
          "label": "Generate Audio",
          "kind": "input",
          "dataType": "boolean"
        },
        {
          "id": "out:result",
          "label": "Generated Video",
          "kind": "output",
          "dataType": "video"
        }
      ],
      "fields": [
        {
          "key": "mode",
          "label": "Mode",
          "handleId": "in:mode",
          "control": "mode_tabs",
          "group": "primary",
          "dataType": "enum",
          "optionsKey": "KLING_V3_PRO_MODE_OPTIONS"
        },
        {
          "key": "start_image_url",
          "label": "Start Frame",
          "handleId": "in:start_image_url",
          "control": "image_upload",
          "layout": "image_upload",
          "group": "primary",
          "dataType": "image",
          "required": true,
          "handleTop": 12,
          "handleVariant": "number",
          "visibleWhen": {
            "key": "mode",
            "in": [
              "image_to_video"
            ]
          }
        },
        {
          "key": "prompt",
          "label": "Prompt",
          "labelWhen": [
            {
              "when": {
                "key": "mode",
                "in": [
                  "image_to_video"
                ]
              },
              "label": "Description"
            }
          ],
          "handleId": "in:prompt",
          "control": "textarea",
          "group": "primary",
          "dataType": "text",
          "required": true,
          "placeholder": "Describe the video you want to generate...",
          "placeholderWhen": [
            {
              "when": {
                "key": "mode",
                "in": [
                  "image_to_video"
                ]
              },
              "placeholder": "Describe the video scene you want to create..."
            }
          ],
          "maxLength": 2500
        },
        {
          "key": "aspect_ratio",
          "label": "Aspect Ratio",
          "handleId": "in:aspect_ratio",
          "control": "select",
          "group": "primary",
          "dataType": "enum",
          "optionsKey": "KLING_V3_PRO_ASPECT_RATIO_OPTIONS",
          "layout": "inline",
          "handleTop": 20,
          "handleVariant": "text",
          "visibleWhen": {
            "key": "mode",
            "in": [
              "text_to_video"
            ]
          }
        },
        {
          "key": "duration",
          "label": "Duration",
          "handleId": "in:duration",
          "control": "select",
          "group": "primary",
          "dataType": "number",
          "optionsKey": "KLING_V3_PRO_DURATION_OPTIONS",
          "layout": "inline",
          "handleTop": 20
        },
        {
          "key": "end_image_url",
          "label": "End Frame",
          "handleId": "in:end_image_url",
          "control": "image_upload",
          "layout": "image_upload",
          "group": "primary",
          "dataType": "image",
          "handleTop": 14,
          "handleVariant": "number",
          "visibleWhen": {
            "key": "mode",
            "in": [
              "image_to_video"
            ]
          }
        },
        {
          "key": "negative_prompt",
          "label": "Negative Prompt",
          "handleId": "in:negative_prompt",
          "control": "textarea",
          "group": "primary",
          "dataType": "text",
          "placeholder": "Describe what you don't want in the video...",
          "maxLength": 2500
        },
        {
          "key": "cfg_scale",
          "label": "CFG Scale",
          "handleId": "in:cfg_scale",
          "control": "slider",
          "layout": "slider",
          "group": "advanced",
          "dataType": "number",
          "handleTop": 14,
          "visibleWhen": {
            "key": "mode",
            "in": [
              "image_to_video"
            ]
          },
          "helpTooltip": "Classifier-free guidance strength. Higher values follow the prompt more closely (0–1).",
          "numberMin": 0,
          "numberMax": 1,
          "numberStep": 0.1,
          "resetValue": 0.5
        },
        {
          "key": "generate_audio",
          "label": "Generate Audio",
          "handleId": "in:generate_audio",
          "control": "boolean",
          "group": "primary",
          "groupWhen": [
            {
              "when": {
                "key": "mode",
                "in": [
                  "text_to_video"
                ]
              },
              "group": "primary"
            },
            {
              "when": {
                "key": "mode",
                "in": [
                  "image_to_video"
                ]
              },
              "group": "advanced"
            }
          ],
          "dataType": "boolean",
          "layout": "inline",
          "handleTop": 14,
          "handleVariant": "enum"
        },
        {
          "key": "elements",
          "label": "Elements",
          "control": "kling_elements",
          "group": "primary",
          "dataType": "image",
          "visibleWhen": {
            "key": "mode",
            "in": [
              "image_to_video"
            ]
          },
          "helpTooltip": "Optional reference subjects (images or videos) to include in the generated video."
        }
      ],
      "defaults": {
        "label": "Kling v3 Pro",
        "config": {
          "providers": [
            "kling-v3-pro-stub"
          ],
          "timeoutMs": 300000,
          "retryPerProvider": 2
        },
        "inputs": {
          "mode": "text_to_video",
          "prompt": "",
          "start_image_url": "",
          "end_image_url": "",
          "aspect_ratio": "16:9",
          "duration": 5,
          "negative_prompt": "",
          "generate_audio": true,
          "cfg_scale": 0.5,
          "elements": []
        },
        "settingsOpen": false
      },
      "pricing": {
        "estimateCredits": 840000
      }
    }
  },
  {
    "type": "merge-video",
    "ui": {
      "title": "Merge Videos",
      "description": "Concatenate multiple videos into one",
      "category": "video",
      "handles": [
        {
          "id": "in:video_urls",
          "label": "Videos",
          "kind": "input",
          "dataType": "video_list"
        },
        {
          "id": "in:transition",
          "label": "Transition",
          "kind": "input",
          "dataType": "enum"
        },
        {
          "id": "out:video_url",
          "label": "Merged Video",
          "kind": "output",
          "dataType": "video"
        }
      ],
      "fields": [
        {
          "key": "video_urls",
          "label": "Videos",
          "handleId": "in:video_urls",
          "control": "image_upload",
          "layout": "image_upload",
          "group": "primary",
          "dataType": "video_list",
          "required": true,
          "handleTop": 12
        },
        {
          "key": "transition",
          "label": "Transition",
          "handleId": "in:transition",
          "control": "select",
          "layout": "inline",
          "group": "primary",
          "dataType": "enum",
          "optionsKey": "MERGE_VIDEO_TRANSITION_OPTIONS",
          "handleTop": 20,
          "handleVariant": "text",
          "helpTooltip": "Allowed values: none, fade, dissolve."
        }
      ],
      "defaults": {
        "label": "Merge Videos",
        "config": {
          "providers": [
            "merge-video-ffmpeg"
          ],
          "timeoutMs": 300000,
          "retryPerProvider": 2
        },
        "inputs": {
          "video_urls": [],
          "transition": "none"
        }
      },
      "pricing": {
        "estimateCredits": 40000
      }
    }
  },
  {
    "type": "merge-av",
    "ui": {
      "title": "Merge Audio & Video",
      "description": "Combine audio track with video",
      "category": "video",
      "handles": [
        {
          "id": "in:video_url",
          "label": "Video",
          "kind": "input",
          "dataType": "video"
        },
        {
          "id": "in:audio_url",
          "label": "Audio",
          "kind": "input",
          "dataType": "audio"
        },
        {
          "id": "in:audio_volume",
          "label": "Audio Volume",
          "kind": "input",
          "dataType": "number"
        },
        {
          "id": "out:video_url",
          "label": "Merged Video",
          "kind": "output",
          "dataType": "video"
        }
      ],
      "fields": [
        {
          "key": "video_url",
          "label": "Video",
          "handleId": "in:video_url",
          "control": "image_upload",
          "layout": "image_upload",
          "group": "primary",
          "dataType": "video",
          "required": true,
          "handleTop": 12
        },
        {
          "key": "audio_url",
          "label": "Audio",
          "handleId": "in:audio_url",
          "control": "image_upload",
          "layout": "image_upload",
          "group": "primary",
          "dataType": "audio",
          "required": true,
          "handleTop": 12
        },
        {
          "key": "audio_volume",
          "label": "Audio Volume",
          "handleId": "in:audio_volume",
          "control": "slider",
          "layout": "slider",
          "group": "primary",
          "dataType": "number",
          "handleTop": 14,
          "numberMin": 0,
          "numberMax": 2,
          "numberStep": 0.1,
          "resetValue": 1
        }
      ],
      "defaults": {
        "label": "Merge Audio & Video",
        "config": {
          "providers": [
            "merge-av-ffmpeg"
          ],
          "timeoutMs": 300000,
          "retryPerProvider": 2
        },
        "inputs": {
          "video_url": "",
          "audio_url": "",
          "audio_volume": 1
        }
      },
      "pricing": {
        "estimateCredits": 30000
      }
    }
  },
  {
    "type": "extract-audio",
    "ui": {
      "title": "Extract Audio",
      "description": "Extract audio track from a video",
      "category": "video",
      "handles": [
        {
          "id": "in:video_url",
          "label": "Video",
          "kind": "input",
          "dataType": "video"
        },
        {
          "id": "in:format",
          "label": "Format",
          "kind": "input",
          "dataType": "enum"
        },
        {
          "id": "out:audio_url",
          "label": "Extracted Audio",
          "kind": "output",
          "dataType": "audio"
        }
      ],
      "fields": [
        {
          "key": "video_url",
          "label": "Video",
          "handleId": "in:video_url",
          "control": "image_upload",
          "layout": "image_upload",
          "group": "primary",
          "dataType": "video",
          "required": true,
          "handleTop": 12
        },
        {
          "key": "format",
          "label": "Format",
          "handleId": "in:format",
          "control": "select",
          "layout": "inline",
          "group": "primary",
          "dataType": "enum",
          "optionsKey": "EXTRACT_AUDIO_FORMAT_OPTIONS",
          "handleTop": 20,
          "handleVariant": "text",
          "helpTooltip": "Output audio format for the extracted track."
        }
      ],
      "defaults": {
        "label": "Extract Audio",
        "config": {
          "providers": [
            "extract-audio-ffmpeg"
          ],
          "timeoutMs": 300000,
          "retryPerProvider": 2
        },
        "inputs": {
          "video_url": "",
          "format": "mp3"
        }
      },
      "pricing": {
        "estimateCredits": 20000
      }
    }
  }
];

export const nodeRegistryByType: Record<string, NodeDefinition> = {
    "request": {
      type: "request",
      ui: nodeDefinitions.find((definition) => definition.type === "request")!.ui,
      input: getNodeInputSchema("request")!,
      output: getNodeOutputSchema("request")!
    },
    "response": {
      type: "response",
      ui: nodeDefinitions.find((definition) => definition.type === "response")!.ui,
      input: getNodeInputSchema("response")!,
      output: getNodeOutputSchema("response")!
    },
    "llm": {
      type: "llm",
      ui: nodeDefinitions.find((definition) => definition.type === "llm")!.ui,
      input: getNodeInputSchema("llm")!,
      output: getNodeOutputSchema("llm")!,
      estimateCredits: estimateOpenRouterLlmCredits
    },
    "gpt-image-2": {
      type: "gpt-image-2",
      ui: nodeDefinitions.find((definition) => definition.type === "gpt-image-2")!.ui,
      input: getNodeInputSchema("gpt-image-2")!,
      output: getNodeOutputSchema("gpt-image-2")!,
      estimateCredits: estimateGptImage2Credits
    },
    "kling-v3-pro": {
      type: "kling-v3-pro",
      ui: nodeDefinitions.find((definition) => definition.type === "kling-v3-pro")!.ui,
      input: getNodeInputSchema("kling-v3-pro")!,
      output: getNodeOutputSchema("kling-v3-pro")!,
      estimateCredits: estimateKlingV3ProCredits
    },
    "merge-video": {
      type: "merge-video",
      ui: nodeDefinitions.find((definition) => definition.type === "merge-video")!.ui,
      input: getNodeInputSchema("merge-video")!,
      output: getNodeOutputSchema("merge-video")!,
      estimateCredits: estimateMergeVideoCredits
    },
    "merge-av": {
      type: "merge-av",
      ui: nodeDefinitions.find((definition) => definition.type === "merge-av")!.ui,
      input: getNodeInputSchema("merge-av")!,
      output: getNodeOutputSchema("merge-av")!,
      estimateCredits: estimateMergeAvCredits
    },
    "extract-audio": {
      type: "extract-audio",
      ui: nodeDefinitions.find((definition) => definition.type === "extract-audio")!.ui,
      input: getNodeInputSchema("extract-audio")!,
      output: getNodeOutputSchema("extract-audio")!,
      estimateCredits: estimateExtractAudioCredits
    }
};

export function getNodeDefinition(type: string | undefined): NodeDefinition | undefined {
  if (!type) return undefined;
  return nodeRegistryByType[type];
}

export function listNodeTypes(): string[] {
  return nodeDefinitions.map((definition) => definition.type);
}
