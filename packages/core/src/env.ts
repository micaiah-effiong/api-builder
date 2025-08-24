import dotenv from "dotenv";

function getProcessEnvironmentFile() {
  if (!process.env.NODE_ENV) {
    return ".env";
  }

  return `.env.${process.env.NODE_ENV}`;
}

// zod verify env
// const parsed = EnvDto.safeParse(_env);
// if (parsed.error) {
//   console.error("Invalid environment variables");
//   console.error(parsed.error, _env);
//   process.exit(1);
// }
//
// const configEnv: EnvDto = parsed.data;

export const env = {};
dotenv.config({ path: getProcessEnvironmentFile(), processEnv: env });
