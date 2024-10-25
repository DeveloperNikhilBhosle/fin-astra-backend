// import { ApiProperty } from '@nestjs/swagger';
// import { Type } from 'class-transformer';
// import {
//   IsNotEmpty,
//   IsString,
//   IsDateString,
//   IsArray,
//   ValidateNested,
//   IsNumber,
//   IsOptional,
//   Validate,
// } from 'class-validator';

// /// Our Assumptions
// class AssumptionAsset {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly asset_class: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly return_percentage: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly risk_level: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @IsString({ each: true })
//   readonly examples: string[];
// }

// class AssumptionYOYGrowth {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly life_stage: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly age_range: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly income_growth: string;
// }

// class AssumptionLiabilities {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly liabilities: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly interest_rate_range: string;
// }

// class Assumption {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => AssumptionAsset)
//   readonly assets: AssumptionAsset[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => AssumptionYOYGrowth)
//   readonly yoy_growth_to_income: AssumptionYOYGrowth[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly yoy_growth_expense: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => AssumptionLiabilities)
//   readonly liabilities_interest_ratio: AssumptionLiabilities[];
// }

// ///// Featured List

// class FeaturedListTable {
//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly insurer: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly plan: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsArray()
//   @IsString({ each: true })
//   readonly pros: string[];

//   @IsOptional()
//   @ApiProperty()
//   @IsArray()
//   @IsString({ each: true })
//   readonly cons: string[];
// }
// class FeaturedInsurance {
//   @IsOptional()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => FeaturedListTable)
//   readonly table: FeaturedListTable[];
// }

// class FeaturedList {
//   @IsOptional()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => FeaturedInsurance)
//   readonly term_insurance: FeaturedInsurance;

//   @IsOptional()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => FeaturedInsurance)
//   readonly health_insurance: FeaturedInsurance;

//   @IsOptional()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => FeaturedInsurance)
//   readonly equity_mutual_funds: FeaturedInsurance;

//   @IsOptional()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => FeaturedInsurance)
//   readonly debt_mutual_fund: FeaturedInsurance;

//   @IsOptional()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => FeaturedInsurance)
//   readonly hybrid_mutual_fund: FeaturedInsurance;

//   @IsOptional()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => FeaturedInsurance)
//   readonly credit_card: FeaturedInsurance;
// }

// ///////// Next Three Months Action Plan

// class NextThreeMonthsActionPlanTable {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly particular: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly amount: string;
// }
// class NextThreeMonthsActionPlanCashflowComments {
//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly title: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly suggestion: string;
// }

// class NextThreeMonthsActionPlanComments {
//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly name: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsArray()
//   readonly comments: NextThreeMonthsActionPlanCashflowComments[];
// }

// class NextThreeMonthsActionPlan {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => NextThreeMonthsActionPlanTable)
//   readonly table: NextThreeMonthsActionPlanTable[];

//   @IsOptional()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => NextThreeMonthsActionPlanComments)
//   readonly cashflow_comments: NextThreeMonthsActionPlanComments[];
// }

// ////  FwP

// class Fwp {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly title: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @IsString({ each: true })
//   readonly desc: string[];
// }

// ///// Insurance Policy Evaluation

// class InsurancePolicyEvaluationTable {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly policy_name: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly plan_type: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly start_date: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly policy_tenure: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly annual_premium: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly life_cover: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly premium_paid_till_date: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly premium_payable: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly surrender_value: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly suggested_action: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly comment: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly accured_bonus: string;
// }

// class InsurancePolicyEvaluationTotal {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly annual_premium: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly life_cover: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly premium_paid_till_date: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly premium_payable: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly surrender_value: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly accured_bonus: string;
// }

// class InsurancePolicyEvaluationRecommendationTable {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly plan: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly cover: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly annual_premium: string;
// }

// class InsurancePolicyEvaluation {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => InsurancePolicyEvaluationTable)
//   readonly table: InsurancePolicyEvaluationTable[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => InsurancePolicyEvaluationTotal)
//   readonly total: InsurancePolicyEvaluationTotal;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   readonly comment: string[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => InsurancePolicyEvaluationRecommendationTable)
//   readonly recommendation_table: InsurancePolicyEvaluationRecommendationTable[];
// }

// ///// MF Holding Evaluation

// class MfHoldingEvaluationTable {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly scheme_name: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly plan: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly category: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly scheme_type: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly current_value: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly fund_evaluation_score: number;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly fund_evaluation_quality: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly excess_annual_expense: string;
// }

// class MfHoldingEvaluationTotal {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly current_value: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly fund_evaluation_score: number;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly excess_annual_expense: string;
// }

// class MfHoldingEvaluation {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => MfHoldingEvaluationTable)
//   readonly table: MfHoldingEvaluationTable[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => MfHoldingEvaluationTotal)
//   readonly total: MfHoldingEvaluationTotal;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @IsString({ each: true })
//   readonly comments1: string[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @IsString({ each: true })
//   readonly comments2: string[];
// }

// /////  MF Portfolio Analysis

// class LiabilityManagementTable {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly liability_type: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly current_liability_distribution_outstanding_percentage: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly current_liability_distribution_emi_percentage: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly suggested_loan_size_range: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly suggested_emi_range: string;
// }

// class LiabilityTotal {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly liability_type: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly current_liability_distribution_outstanding_percentage: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly current_liability_distribution_emi_percentage: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly suggested_loan_size_range: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly suggested_emi_range: string;
// }

// class LiabilitiesManagement {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => LiabilityManagementTable)
//   readonly table: LiabilityManagementTable[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => LiabilityTotal)
//   readonly total: LiabilityTotal;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @IsString({ each: true })
//   readonly comments: string[];
// }

// ///BureauReportSummary

// class CreditFacilitiesTaken {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly type_of_facility: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly total_records: number;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly active_accounts: number;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly closed_accounts: number;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly accounts_with_negative_history: number;
// }

// class CreditScoreAnalysis {
//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly score: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly our_evaluation: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly commentary: string;
// }

// class BureauReportSummary {
//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => CreditScoreAnalysis)
//   readonly credit_score_analysis: CreditScoreAnalysis;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => CreditFacilitiesTaken)
//   readonly credit_facilities_taken: CreditFacilitiesTaken[];
// }

// class ProjectionTable {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly year: number;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly cnwt: number;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly nwtet: number;
// }

// class NetworthProjection {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => ProjectionTable)
//   readonly table: ProjectionTable[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly retirement_month_year: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly retirement_cnwt: number;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly retirement_nwtet: number;
// }

// class NetworthDto {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly networth: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly assets: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly liabilities: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => NetworthProjection)
//   readonly networth_projection: NetworthProjection;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly value_under_advisory: string;
// }

// /////Asset Allocation
// class AllocationItem {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly title: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly total: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly ideal_range: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly comment: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly color: string;
// }

// export class AssetAllocationDto {
//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => AllocationItem)
//   readonly equity: AllocationItem;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => AllocationItem)
//   readonly real_estate: AllocationItem;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => AllocationItem)
//   readonly passive_income_assets: AllocationItem;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => AllocationItem)
//   readonly debt: AllocationItem;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => AllocationItem)
//   readonly alternative_investments: AllocationItem;
// }

// //// ratio
// class RatioItem {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly title: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly total: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly ideal_range: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly comment: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly color: string;
// }

// export class RatiosDto {
//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => RatioItem)
//   readonly good_liabilities_to_total_assets: RatioItem;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => RatioItem)
//   readonly bad_liabilities_to_total_assets: RatioItem;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => RatioItem)
//   readonly expense_to_income: RatioItem;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => RatioItem)
//   readonly good_liabilities_linked_emi_to_income: RatioItem;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => RatioItem)
//   readonly bad_liabilities_linked_emi_to_income: RatioItem;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => RatioItem)
//   readonly investments_to_income: RatioItem;
// }

// class EmergencyFunds {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly title: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly total: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly ideal_range: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly comment: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly color: string;
// }
// //// Emergency

// class LifeInsuranceDto {
//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => EmergencyFunds)
//   readonly emergency_funds: EmergencyFunds;
// }

// class HealthInsuranceDto {
//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => EmergencyFunds)
//   readonly emergency_funds: EmergencyFunds;
// }

// class EmergencyDto {
//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => EmergencyFunds)
//   readonly emergency_funds: EmergencyFunds;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => LifeInsuranceDto)
//   readonly life_insurance: LifeInsuranceDto;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => HealthInsuranceDto)
//   readonly health_insurance: HealthInsuranceDto;
// }

// ///Liabilities
// class LiabilityItem {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly liability: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly account_age_in_months: number;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly pending_months: number;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly interest_rate: number;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly liability_category: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly outstanding_amount: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly emi: string;
// }

// class LiabilitiesDto {
//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly total: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => LiabilityItem)
//   readonly table: LiabilityItem[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => PieItem)
//   readonly pie: PieItem[];
// }
// class PieItem {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly particular: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly percentage: number;
// }

// class TableItem {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly asset: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly percentage: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly asset_class: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly market_value: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly monthly_investments: string;
// }

// ///Assets
// class AssetTotal {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly market_value: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly monthly_investments: string;
// }

// class AssetsDto {
//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => AssetTotal)
//   readonly total: AssetTotal;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => TableItem)
//   readonly table: TableItem[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => PieItem)
//   readonly pie: PieItem[];
// }

// ///OneView
// class Total {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly assets: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly liabilities: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly income: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly expense: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly insurance: string;
// }

// class Expense {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly title: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly value: string;
// }

// class Income {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly title: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly value: string;
// }

// class Liabilities {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly title: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly value: string;
// }
// class Insurance {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly title: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly value: string;
// }

// class Asset {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly title: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly value: string;
// }
// class OneViewDto {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsNumber()
//   readonly fbs: number;

//   @IsOptional()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => Asset)
//   readonly assets: Asset[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => Insurance)
//   readonly insurance: Insurance[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => Liabilities)
//   readonly liabilities: Liabilities[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => Income)
//   readonly income: Income[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => Expense)
//   readonly expense: Expense[];

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => Total)
//   readonly total: Total;
// }

// ///MoneySign
// export class GenProfileDto {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly gen_profile: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsString()
//   readonly gen_profile_desc: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly life_stage: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly life_stage_age_range: string;

//   @IsOptional()
//   @ApiProperty()
//   @IsArray()
//   @IsString({ each: true })
//   readonly life_stage_desc: string[];
// }

// class BehaviouralBias {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly title: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly desc: string;
// }

// export class MoneySignDto {
//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly money_sign: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsString()
//   readonly money_sign_desc: string;

//   @IsNotEmpty()
//   @ApiProperty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => BehaviouralBias)
//   readonly money_sign_behavioural_bias: BehaviouralBias[];
// }

// export class MetaDto {
//   @ApiProperty()
//   readonly date: string;

//   @ApiProperty()
//   @IsString()
//   readonly mobile_number: string;
// }

// export class FwpDto {
//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => MetaDto)
//   readonly meta: MetaDto;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => MoneySignDto)
//   readonly money_sign: MoneySignDto;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => GenProfileDto)
//   readonly gen_profile: GenProfileDto;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => OneViewDto)
//   readonly oneview: OneViewDto;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => AssetsDto)
//   readonly assets: AssetsDto;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => LiabilitiesDto)
//   readonly liabilities: LiabilitiesDto;

//   @IsOptional()
//   @ApiProperty()
//   readonly emergency: EmergencyDto;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => RatiosDto)
//   readonly ratios: RatiosDto;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => AssetAllocationDto)
//   readonly asset_allocation: AssetAllocationDto;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => NetworthDto)
//   readonly networth: NetworthDto;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => BureauReportSummary)
//   readonly bureau_report_summary: BureauReportSummary;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => MfHoldingEvaluation)
//   readonly mf_holding_evaluation: MfHoldingEvaluation;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => InsurancePolicyEvaluation)
//   readonly insurance_policy_evaluation: InsurancePolicyEvaluation;

//   @IsOptional()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => LiabilitiesManagement)
//   readonly liabilities_management: LiabilitiesManagement;

//   @IsNotEmpty()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => NextThreeMonthsActionPlan)
//   readonly next_three_months_action_plan: NextThreeMonthsActionPlan;

//   @IsOptional()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => FeaturedList)
//   readonly featured_list: FeaturedList;

//   @IsOptional()
//   @ApiProperty()
//   @ValidateNested()
//   @Type(() => Assumption)
//   readonly assumption: Assumption;
// }
