import { QueryResult } from "../types";

export interface ConflictItem {
  field: string;
  label: string;
  qqwryValue: string;
  ipipValue: string;
}

export interface MergedGeoInfo {
  query: string;
  queryType: "ip" | "phone" | "unknown";
  success: boolean;
  country: string;
  province: string;
  city: string;
  district?: string;
  fullLocation: string;
  primaryOrg: string; // 核心机构或运营商大字 (如: 北京大学 / 中国移动)
  secondaryNote?: string; // 次级网络或出口属性 (如: 中国教育网 / 数据上网公共出口)
  conflicts: ConflictItem[];
  extra: Record<string, string>;
  errorMessage?: string;
  timestamp: number;
}

function cleanRegion(val: string): string {
  return val
    .replace(/(省|自治区|特别行政区|壮族自治区|维吾尔自治区|回族自治区|市|区)$/, "")
    .trim();
}

function normalizeCarrier(carrier: string): string {
  if (!carrier) return "";
  if (carrier === "移动" || carrier === "中国移动") return "中国移动";
  if (carrier === "电信" || carrier === "中国电信") return "中国电信";
  if (carrier === "联通" || carrier === "中国联通") return "中国联通";
  if (carrier === "广电" || carrier === "中国广电") return "中国广电";
  if (carrier === "教育网" || carrier === "CERNET") return "中国教育网 (CERNET)";
  return carrier;
}

export function mergeGeoResult(result: QueryResult): MergedGeoInfo {
  const conflicts: ConflictItem[] = [];
  const extra: Record<string, string> = {};

  if (!result.success) {
    return {
      query: result.query,
      queryType: result.query_type,
      success: false,
      country: "",
      province: "",
      city: "",
      fullLocation: "未找到信息",
      primaryOrg: "",
      conflicts: [],
      extra: {},
      errorMessage: result.error_message || "未找到归属地信息",
      timestamp: result.timestamp,
    };
  }

  // 手机号查询
  if (result.query_type === "phone") {
    const locParts = [result.province, result.city].filter(
      (p) => p && p.trim().length > 0
    );
    return {
      query: result.query,
      queryType: "phone",
      success: true,
      country: "中国",
      province: result.province,
      city: result.city,
      fullLocation: locParts.join(" "),
      primaryOrg: normalizeCarrier(result.isp),
      conflicts: [],
      extra: result.details,
      timestamp: result.timestamp,
    };
  }

  // IP 查询：融合纯真 (CZ88) 与 IPIP
  let country = result.ipip_country || result.country || "中国";
  let province = result.ipip_province || result.province || "";
  let city = result.ipip_city || result.city || "";
  let district = "";

  // 1. 解析纯真地理位置
  if (result.qqwry_country) {
    const rawQ = result.qqwry_country;
    let qProv = "";
    let qCity = "";
    let qDist = "";

    if (rawQ.includes("–") || rawQ.includes("-")) {
      const parts = rawQ.split(/[–-]/).map((p) => p.trim());
      if (parts.length >= 2) qProv = parts[1];
      if (parts.length >= 3) qCity = parts[2];
      if (parts.length >= 4) qDist = parts[3];
    } else {
      const m = rawQ.match(/^(?:中国)?(.*?省|.*?自治区|.*?市)?(.*?市|.*?地区|.*?州)?(.*?[区县])?$/);
      if (m) {
        if (m[1]) qProv = m[1];
        if (m[2]) qCity = m[2];
        if (m[3]) qDist = m[3];
      }
    }

    if (qDist) district = qDist;

    // 省份比对
    if (qProv && province) {
      const cQ = cleanRegion(qProv);
      const cI = cleanRegion(province);
      if (cQ && cI && cQ !== cI && !cQ.includes(cI) && !cI.includes(cQ)) {
        conflicts.push({
          field: "province",
          label: "归属省份",
          qqwryValue: qProv,
          ipipValue: province,
        });
      }
    } else if (qProv && !province) {
      province = qProv;
    }

    // 城市比对
    if (qCity && city) {
      const cQ = cleanRegion(qCity);
      const cI = cleanRegion(city);
      if (cQ && cI && cQ !== cI && !cQ.includes(cI) && !cI.includes(cQ)) {
        conflicts.push({
          field: "city",
          label: "归属城市",
          qqwryValue: qCity,
          ipipValue: city,
        });
      }
    } else if (qCity && !city) {
      city = qCity;
    }
  }

  // 2. 核心运营商与具体机构名称深度融合 (绝不丢弃纯真详情)
  const rawArea = (result.qqwry_area || "").trim();
  const rawIpipIsp = (result.ipip_isp || result.isp || "").trim();

  let carrier = normalizeCarrier(rawIpipIsp);
  let specificOrg = "";

  if (rawArea && rawArea !== "CZ88.NET") {
    if (rawArea.includes("/")) {
      // 格式类似: "教育网/北京大学" 或 "移动/数据上网公共出口"
      const slashIndex = rawArea.indexOf("/");
      const p1 = rawArea.substring(0, slashIndex).trim();
      const p2 = rawArea.substring(slashIndex + 1).trim();

      if (!carrier) carrier = normalizeCarrier(p1);
      specificOrg = p2;
    } else {
      // 格式类似: "清华大学" 或 "电信"
      const isPureCarrier = ["电信", "移动", "联通", "铁通", "广电", "教育网"].some(
        (c) => rawArea === c || rawArea === `中国${c}`
      );
      if (isPureCarrier) {
        if (!carrier) carrier = normalizeCarrier(rawArea);
      } else {
        specificOrg = rawArea;
      }
    }
  }

  // 确定 Primary 和 Secondary：如果有具体大学/企业/机房名称，优先做大字展示
  let primaryOrg = "";
  let secondaryNote = "";

  if (specificOrg && carrier) {
    primaryOrg = specificOrg;
    secondaryNote = carrier;
  } else if (specificOrg) {
    primaryOrg = specificOrg;
  } else if (carrier) {
    primaryOrg = carrier;
  } else {
    primaryOrg = "未知运营商/机构";
  }

  // 整理完整地理位置名称
  const locArr = [
    country !== "中国" ? country : null,
    province,
    city && city !== province ? city : null,
    district,
  ].filter(Boolean) as string[];

  const fullLocation = locArr.length > 0 ? locArr.join(" ") : "未知归属地";

  // 收集附加信息
  const allowedKeys: Record<string, string> = {
    area_code: "长途区号",
    zip_code: "邮政编码",
    latitude: "纬度",
    longitude: "经度",
    timezone: "时区",
    china_admin_code: "行政代码",
    network_scope: "网络类型",
  };

  for (const [k, label] of Object.entries(allowedKeys)) {
    const v = result.details[k];
    if (v && v.trim().length > 0) {
      extra[label] = v.trim();
    }
  }

  return {
    query: result.query,
    queryType: "ip",
    success: true,
    country,
    province,
    city,
    district,
    fullLocation,
    primaryOrg,
    secondaryNote: secondaryNote || undefined,
    conflicts,
    extra,
    timestamp: result.timestamp,
  };
}
