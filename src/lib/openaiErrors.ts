export function getOpenAIErrorMessage(data: unknown, fallback: string) {
  const message = (data as { error?: { message?: string; code?: string; type?: string } }).error?.message;
  const code = (data as { error?: { code?: string } }).error?.code;
  const rawMessage = message ? `${fallback} ${message}` : fallback;

  return normalizeOpenAIError(rawMessage, code);
}

export function normalizeOpenAIError(message: string, code?: string) {
  const lowerMessage = message.toLowerCase();

  if (
    code === "insufficient_quota" ||
    lowerMessage.includes("exceeded your current quota") ||
    lowerMessage.includes("check your plan and billing")
  ) {
    return [
      "OpenAI API 사용 한도 또는 결제 크레딧이 부족합니다.",
      "프롬프트 분석은 로컬 규칙 기반으로 계속 볼 수 있지만, 실제 이미지 생성은 OpenAI 결제/한도 문제가 해결된 뒤 가능합니다.",
      "OpenAI Platform의 Usage, Limits, Billing 설정에서 남은 크레딧과 프로젝트 예산을 확인해 주세요."
    ].join(" ");
  }

  if (lowerMessage.includes("incorrect api key") || lowerMessage.includes("invalid api key")) {
    return "OpenAI API Key가 올바르지 않습니다. .env.local의 OPENAI_API_KEY 값에 오타나 앞뒤 공백이 없는지 확인해 주세요.";
  }

  if (lowerMessage.includes("rate limit")) {
    return "OpenAI API 요청 속도 제한에 걸렸습니다. 잠시 후 다시 시도하거나 품질/생성 빈도를 낮춰 주세요.";
  }

  return message;
}
