terraform {
  required_version = ">= 1.10"
  # Shared state, so CI can deploy too; workspaces live under env:/<name>/.
  # The bucket is created once by hand (versioned, private).
  backend "s3" {
    bucket       = "portfolio-chat-tfstate-052407073487"
    key          = "portfolio-chat.tfstate"
    region       = "eu-central-1"
    use_lockfile = true
  }
  required_providers {
    aws     = { source = "hashicorp/aws", version = "~> 6.0" }
    archive = { source = "hashicorp/archive", version = "~> 2.4" }
    random  = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

variable "region" {
  type    = string
  default = "eu-central-1"
}

variable "budget_email" {
  type        = string
  description = "Gets an email when monthly AWS spend crosses the budget."
}

variable "monthly_budget_usd" {
  type    = number
  default = 5
}

variable "alert_errors" {
  type        = number
  default     = 3
  description = "Questions ending in an error within 15 minutes that send an alert."
}

variable "alert_latency_ms" {
  type        = number
  default     = 15000
  description = "Average answer time over 15 minutes above which an alert goes out."
}

variable "lambda_concurrency" {
  type        = number
  default     = -1
  description = "Reserved concurrency cap, -1 for none. Reserving needs an account quota above 10, since AWS keeps 10 unreserved; at quota 10 the account itself caps Lambda at 10."
}

variable "llm_model" {
  type    = string
  default = "google:gemini-3.5-flash-lite"
}

variable "llm_fallback_models" {
  type        = list(string)
  default     = ["openai:gpt-5-nano"]
  description = "Backups in the order to try them. One whose API key is not set in SSM yet is skipped."
}

variable "embedding_model" {
  type    = string
  default = "google:gemini-embedding-001"
}

variable "github_subject" {
  type        = string
  default     = "repo:elik56a@44751346/portfolio-chat@1424784352"
  description = <<-EOT
    The only repo whose main branch may deploy, as GitHub's OIDC subject prefix.
    The repo uses immutable subjects (owner and repo ids), so a renamed or
    re-created repo can't inherit the role. See
    `gh api repos/OWNER/REPO/actions/oidc/customization/sub`.
  EOT
}

variable "lwa_layer_version" {
  type    = number
  default = 24
}

# CloudFront only takes certificates from us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags {
    tags = { project = "portfolio-chat", env = terraform.workspace }
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = { project = "portfolio-chat", env = terraform.workspace }
  }
}

locals {
  # Custom domain per environment (DNS at Cloudflare); none = cloudfront.net only.
  domain = lookup({ staging = "staging.eliyahukriel.dev", prod = "eliyahukriel.dev" }, terraform.workspace, "")
  # Staging deploys on every push to main; prod only from a job in the `prod` GitHub
  # environment, which waits for a reviewer to approve it.
  deploy_subject = terraform.workspace == "prod" ? "environment:prod" : "ref:refs/heads/main"
  name           = "portfolio-chat-${terraform.workspace}"
  ssm_prefix     = "/portfolio-chat/${terraform.workspace}"
  secrets        = ["DATABASE_URL", "GOOGLE_API_KEY", "OPENAI_API_KEY", "TURNSTILE_SECRET_KEY", "LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY", "IP_HASH_SALT", "SESSION_SECRET"]
}

data "aws_caller_identity" "me" {}

# Static site

resource "aws_s3_bucket" "site" {
  bucket = "${local.name}-site-${data.aws_caller_identity.me.account_id}"
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${local.name}-site"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.site.arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn } }
    }]
  })
}

# API: FastAPI on Lambda via Lambda Web Adapter, streamed through a Function URL

data "archive_file" "placeholder" {
  type        = "zip"
  source_dir  = "${path.module}/placeholder"
  output_path = "${path.module}/.build/placeholder.zip"
}

resource "aws_iam_role" "api" {
  name = "${local.name}-api"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy_attachment" "api_logs" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "api" {
  role = aws_iam_role.api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
        Resource = aws_dynamodb_table.counters.arn
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParametersByPath", "ssm:GetParameter"]
        Resource = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.me.account_id}:parameter${local.ssm_prefix}*"
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.name}-api"
  retention_in_days = 7
}

resource "random_password" "origin_verify" {
  length  = 32
  special = false
}

resource "aws_lambda_function" "api" {
  function_name                  = "${local.name}-api"
  role                           = aws_iam_role.api.arn
  runtime                        = "python3.12"
  architectures                  = ["arm64"]
  handler                        = "run.sh"
  memory_size                    = 512
  timeout                        = 30
  reserved_concurrent_executions = var.lambda_concurrency
  filename                       = data.archive_file.placeholder.output_path
  source_code_hash               = data.archive_file.placeholder.output_base64sha256
  layers                         = ["arn:aws:lambda:${var.region}:753240598075:layer:LambdaAdapterLayerArm64:${var.lwa_layer_version}"]

  environment {
    variables = {
      AWS_LAMBDA_EXEC_WRAPPER = "/opt/bootstrap"
      AWS_LWA_INVOKE_MODE     = "response_stream"
      PORT                    = "8080"
      DYNAMODB_TABLE          = aws_dynamodb_table.counters.name
      SSM_PREFIX              = local.ssm_prefix
      LOG_JSON                = "true"
      LLM_MODEL               = var.llm_model
      LLM_FALLBACK_MODELS     = jsonencode(var.llm_fallback_models)
      EMBEDDING_MODEL         = var.embedding_model
      ORIGIN_VERIFY_SECRET    = random_password.origin_verify.result
    }
  }

  # CI deploys the real code; Terraform only creates the function.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  depends_on = [aws_cloudwatch_log_group.api]
}

resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"
  invoke_mode        = "RESPONSE_STREAM"
}

# Counters and rate limit

resource "aws_dynamodb_table" "counters" {
  name         = "${local.name}-counters"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }
}

# Secrets: created empty, values set by hand so they never touch state or the repo.
# Each name is the env var the API reads; it loads them at cold start (app/ssm.py).

resource "aws_ssm_parameter" "secret" {
  for_each = toset(local.secrets)
  name     = "${local.ssm_prefix}/${each.key}"
  type     = "SecureString"
  value    = "CHANGE_ME"

  lifecycle {
    ignore_changes = [value]
  }
}

# CDN: one domain for site and API, so the browser never needs CORS

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

# Security headers on every response. The page's script rules (CSP with
# script fingerprints) are written into each HTML file at build time, because
# they change with every build; the header holds the rules that only work as
# a header, like refusing to be framed.
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${local.name}-security"

  security_headers_config {
    content_security_policy {
      content_security_policy = "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'; upgrade-insecure-requests"
      override                = true
    }
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=(), payment=()"
      override = true
    }
    items {
      header   = "Cross-Origin-Opener-Policy"
      value    = "same-origin"
      override = true
    }
  }
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  http_version        = "http2and3"

  origin {
    origin_id                = "site"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  origin {
    origin_id   = "api"
    domain_name = trimsuffix(trimprefix(aws_lambda_function_url.api.function_url, "https://"), "/")

    custom_header {
      name  = "x-origin-verify"
      value = random_password.origin_verify.result
    }

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 30
    }
  }

  default_cache_behavior {
    target_origin_id           = "site"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  ordered_cache_behavior {
    path_pattern               = "/api/*"
    target_origin_id           = "api"
    viewer_protocol_policy     = "https-only"
    allowed_methods            = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = false
    cache_policy_id            = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_except_host.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  aliases = local.domain == "" ? [] : [local.domain]

  viewer_certificate {
    cloudfront_default_certificate = local.domain == ""
    acm_certificate_arn            = local.domain == "" ? null : aws_acm_certificate_validation.site[0].certificate_arn
    ssl_support_method             = local.domain == "" ? null : "sni-only"
    minimum_protocol_version       = local.domain == "" ? null : "TLSv1.2_2021"
  }
}

# HTTPS for the custom domain. The DNS records that prove ownership are added
# by hand at Cloudflare (see the certificate_dns output); apply waits for them.
resource "aws_acm_certificate" "site" {
  count             = local.domain == "" ? 0 : 1
  provider          = aws.us_east_1
  domain_name       = local.domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "site" {
  count           = local.domain == "" ? 0 : 1
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.site[0].arn
}

output "certificate_dns" {
  description = "Add at Cloudflare as DNS-only CNAMEs to prove the domain is ours."
  value = local.domain == "" ? [] : [
    for o in aws_acm_certificate.site[0].domain_validation_options :
    { name = o.resource_record_name, type = o.resource_record_type, value = o.resource_record_value }
  ]
}

# Cost alarm (the first two AWS budgets are free)

resource "aws_budgets_budget" "monthly" {
  name         = "${local.name}-monthly"
  budget_type  = "COST"
  limit_amount = var.monthly_budget_usd
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_email]
  }
}

# Alerts (P3.9): read from the API's JSON logs, sent by email

locals {
  metrics_namespace = "PortfolioChat/${terraform.workspace}"
  log_metrics = {
    BudgetWarnings = { pattern = "{ $.event = \"budget_80_percent\" }", value = "1" }
    Errors         = { pattern = "{ $.event = \"request.finished\" && $.outcome = \"error\" }", value = "1" }
    LatencyMs      = { pattern = "{ $.event = \"usage.reported\" }", value = "$.latency_ms" }
  }
  alarms = {
    budget-80 = { metric = "BudgetWarnings", stat = "Sum", period = 300, threshold = 1, about = "A spend cap (day or month) passed 80%." }
    errors    = { metric = "Errors", stat = "Sum", period = 900, threshold = var.alert_errors, about = "Questions are ending in errors." }
    slow      = { metric = "LatencyMs", stat = "Average", period = 900, threshold = var.alert_latency_ms, about = "Answers are slow." }
  }
}

resource "aws_sns_topic" "alerts" {
  name = "${local.name}-alerts"
}

# AWS emails a confirmation link first; alerts arrive only after it is clicked.
resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.budget_email
}

resource "aws_cloudwatch_log_metric_filter" "api" {
  for_each       = local.log_metrics
  name           = "${local.name}-${each.key}"
  log_group_name = aws_cloudwatch_log_group.api.name
  pattern        = each.value.pattern

  metric_transformation {
    name      = each.key
    namespace = local.metrics_namespace
    value     = each.value.value
  }
}

resource "aws_cloudwatch_metric_alarm" "api" {
  for_each            = local.alarms
  alarm_name          = "${local.name}-${each.key}"
  alarm_description   = each.value.about
  namespace           = local.metrics_namespace
  metric_name         = each.value.metric
  statistic           = each.value.stat
  period              = each.value.period
  evaluation_periods  = 1
  threshold           = each.value.threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  depends_on          = [aws_cloudwatch_log_metric_filter.api]
}

# CI deploy role: GitHub Actions (main for staging, the approved `prod` environment for prod) may update this environment's code
# and site, nothing else. The OIDC provider is one per account, created once
# by hand (aws iam create-open-id-connect-provider).
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_role" "deploy" {
  name = "${local.name}-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = data.aws_iam_openid_connect_provider.github.arn }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "${var.github_subject}:${local.deploy_subject}"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "deploy" {
  name = "deploy"
  role = aws_iam_role.deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["lambda:UpdateFunctionCode", "lambda:GetFunction", "lambda:GetFunctionConfiguration"]
        Resource = aws_lambda_function.api.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.site.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.site.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = aws_cloudfront_distribution.cdn.arn
      },
    ]
  })
}

output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}

output "site_url" {
  value = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}

output "site_bucket" {
  value = aws_s3_bucket.site.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.cdn.id
}

output "api_function_name" {
  value = aws_lambda_function.api.function_name
}

output "counters_table" {
  value = aws_dynamodb_table.counters.name
}
