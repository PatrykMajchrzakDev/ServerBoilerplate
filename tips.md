alt z for code formatting

QR Generator - Base64 into code = https://codebeautify.org/base64-to-image-converter

Prisma transaction - one condensed query to update multiple models

const [updatedPreferences, updatedAccount] = await prisma.$transaction([
prisma.userPreferences.update({
where: { userId: user.id },
data: {
enable2FA: false,
},
}),
prisma.account.update({
where: { userId: user.id },
data: {
twoFactorSecret: null,
},
}),
]);
