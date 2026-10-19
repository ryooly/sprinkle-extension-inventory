import { logger } from "@/logger";
import { AppError } from "@/errorhandler";
import {
  close,
  extract as extractNeedleJson,
  type JsonSchema,
} from "cactus-needle";

export type { JsonSchema };

export type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type TextToJsonTemplateOutput = {
  name: string;
  endpoint: string;
  data: string;
  rate: number;
};

export const TEXT_TO_JSON_TEMPLATE: JsonSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Name of the analyzed source or extension",
    },
    endpoint: {
      type: "string",
      description: "Link or endpoint address of the analyzed source",
    },
    data: {
      type: "string",
      description: "Key information gathered about this source",
    },
    rate: {
      type: "number",
      minimum: 1,
      maximum: 5,
      description:
        "Safety rating from 1 (dangerous) to 5 (fully trusted); decimals allowed, e.g. 1.4 or 3.4",
    },
  },
  required: ["name", "endpoint", "data", "rate"],
};

export function isTextToJsonTemplateOutput(
  value: unknown,
): value is TextToJsonTemplateOutput {
  if (!isJsonRecord(value)) return false;
  return (
    typeof value.name === "string" &&
    typeof value.endpoint === "string" &&
    typeof value.data === "string" &&
    typeof value.rate === "number" &&
    value.rate >= 1 &&
    value.rate <= 5
  );
}

export interface TextToJsonRequest {
  text: string;
  schema?: JsonSchema;
  maxOutputTokens?: number;
}

export async function convertTextToJson<T extends JsonRecord = JsonRecord>(
  request: TextToJsonRequest,
  validate?: (value: unknown) => value is T,
): Promise<T> {
  const {
    text,
    schema = TEXT_TO_JSON_TEMPLATE,
    maxOutputTokens = 1024,
  } = request;

  if (!text.trim()) {
    throw new AppError("Input text must not be empty", 400);
  }

  const output = await extractNeedleJson(text, schema, {
    maxNewTokens: maxOutputTokens,
  });

  if (output === null || !isJsonRecord(output)) {
    logger.warn(
      `[text-to-json] Needle extraction failed for ${text.slice(0, 80)}`,
    );
    throw new AppError("Local model returned no valid JSON object", 502);
  }

  if (validate && !validate(output)) {
    throw new AppError(
      "Local model output does not match the requested JSON format",
      502,
    );
  }

  return output as T;
}

export async function closeTextToJsonModel(): Promise<void> {
  await close();
}

/// masih perlu di proses. Kurang lebih cara kerjanya antara lain kita scarping tiap endpoint yang tersedia di dalam folder -> kita akan menatanya dan kemudain di insert ke dalam ai untuk di gali infromasinya -> kemudain setelah infromasi di dapatkan kita lemparkan ke dalam -> needle dan kemudain di tata dalam json dengan infromasi (link endpoint, infromation, rating keamanan 1-5) ---------> Ini berkaitan dengan repo rating yang mana nanti di petakan dalm -> ()

/// kita mengubah strateginya dari awal dari mulai expand endpoint menjadi json itu akan lebih mudah dan effisien tapi kita juga perlu pake cara agent gaksi harusnya kayak mengerjakan step 1 dulu baru step 2

/// FINAL NOTES:
/// pertama kita mengambil scarping data dari github yang langusng di pecah dan dimasukan ke dalam mungkin kek array atau apapun, kemudian itu akan di kirim ke ai untuk di peccah dan di telusuri dan mengembalikan terakhir ada needle yang berfungsi disinni
