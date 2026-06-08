
<!-- this is information with related to solve this problem according to me (mrityunjay) -->


 <!-- 28 / 02/ 2027 =>  --> 
 ### "I worked on the Case Intake page and the Property Location page . I resolved the issue related to the “Property Identified” and “Property Not Identified” questions on both pages (Property Location and Case Intake)."



<!-- 02/03/ 2026    -->
 ### Fixed the BT / BT with Top-Up / Top-Up Only flow and corrected the left-side form progress bar page-wise.

 ### Added a tenure question on the Loan Requirement ( all type of BT ) page.


 ### Remove the condition from the dealFinancials page so the form flow works correctly.
  ''' showWhen:  {
		in: [{ var: 'purchaseType' }, ['resale_normal', 'resale_endorsement']]
	} ''' 


### Fix  condition of state and city related conditions .

### Resolved the bug in the “Special Restricted Zone” and “Intended Use of the Property” related questions.

 

 "src\lib\config\wizardSections\homeLoan.ts"
### Fixed the order issue where the "Legal & Seller" page appeared above the Applicant section in the new home loan flow, causing incorrect left-side navigation.


### implement showWhen: (answers) =>  answers['loanType'] === 'New Loan' && answers['propertyIdentified'] === 'Yes', in this page "Legal & Seller" 


### implement showWhen: (answers) => answers['loanType'] != 'New Loan' , in this page "BT Registry & Possession" for this page not show in new loan.


### Fixed missing options for the question "Which lender does the seller currently have the loan with?" on the Seller & Transaction Details page.


### Fix navigation issue for the Legal & Seller page and correct sub-page rendering logic.


### Add warning logic for "Is the project registered under RERA?" when property stage is Under Construction and RERA status is NOT_REGISTERED.

### Add placeholder for CIBIL score input field.