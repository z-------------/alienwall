<?php
$code = $_GET["code"];

$url = "https://www.reddit.com/api/v1/access_token";

$values = array(
    "grant_type" => "authorization_code",
    "code" => $code,
    "redirect_uri" => "http://localhost:8000/auth/auth_callback.php"
);

$pwdFilePath = $_SERVER["DOCUMENT_ROOT"] . "/clientinfo";
$pwdFile = fopen($pwdFilePath, "r");
$pwdStr = fread($pwdFile, filesize($pwdFilePath));
fclose($pwdFile);
$pwdB64 = base64_encode($pwdStr);

$headers = ["Content-Type: application/x-www-form-urlencoded",
    "Authorization: Basic " . $pwdB64,
    "User-Agent: web:alienwall:v0.0.1 (by /u/thedonkeypie)"];

$options = array(
    "http" => array(
        "header" => $headers,
        "method" => "POST",
        "content" => http_build_query($values),
    ),
);
$context  = stream_context_create($options);
$response = file_get_contents($url, false, $context);

$responseJSON = json_decode($response);
$responseData = get_object_vars($responseJSON);
$accessToken = $responseData["access_token"];
$tokenExpiry = (int)$responseData["expires_in"];
$refreshRoken = $responseData["refresh_token"];

$tenYears = 315569260; //10 years
$tenYearsFromNow = time() + $tenYears;

setcookie("access_token", $accessToken, time() + $tokenExpiry, "/");
setcookie("refresh_token", $refreshRoken, $tenYearsFromNow, "/");
setcookie("authdate", time() * 1000, $tenYearsFromNow, "/");

header("Content-Type: text/html");
header("Location: /wall/");
?>