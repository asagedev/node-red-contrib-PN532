// To compile this simple example:
// $ gcc -pthread -o nfc_scan nfc_scan.c -lnfc

#include <stdlib.h>
#include <signal.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>
#include <nfc/nfc.h>

static void
print_long(const uint8_t *pbtData, const size_t szBytes)
{
  size_t  szPos;

  for (szPos = 0; szPos < szBytes; szPos++) {
    printf("%03lu", pbtData[szPos]);
  }
  printf("\n");
  fflush(stdout);
}

void*
input_function(void *args){
  char str[6];
  char close[6];
  int res;

  strcpy(close,"close");

  while(true){
    fgets(str, sizeof str, stdin);

    res = strcmp(str,close);

    if(res == 0){
      exit(0);
    }
  }
}

void
INThandler(int sig)
{
  exit(0);
}

int
main(int argc, const char* argv[])
{
  signal(SIGINT, INThandler);
  signal(SIGKILL, INThandler);;

  int timeout = atoi(argv[1]);
  pthread_t input;
  nfc_device *pnd;
  nfc_target nt;

  // Start input thread
  pthread_create(&input, NULL, input_function, NULL);

  // Allocate only a pointer to nfc_context
  nfc_context *context;

  // Initialize libnfc and set the nfc_context
  nfc_init(&context);
  if (context == NULL) {
    printf("Unable to init libnfc (malloc)\n");
    exit(EXIT_FAILURE);
  }

  // Open, using the first available NFC device which can be in order of selection:
  //   - default device specified using environment variable or
  //   - first specified device in libnfc.conf (/etc/nfc) or
  //   - first specified device in device-configuration directory (/etc/nfc/devices.d) or
  //   - first auto-detected (if feature is not disabled in libnfc.conf) device
  pnd = nfc_open(context, NULL);

  //Send error
  if (pnd == NULL) {
    printf("ERROR: %s\n", "Unable to open NFC device.");
    exit(EXIT_FAILURE);
  }

  // Set opened NFC device to initiator mode
  if (nfc_initiator_init(pnd) < 0) {
    nfc_perror(pnd, "nfc_initiator_init");
    exit(EXIT_FAILURE);
  }
  while(true){
    // Poll for a ISO14443A (MIFARE) tag
    const nfc_modulation nmMifare = {
      .nmt = NMT_ISO14443A,
      .nbr = NBR_106,
    };

    //Print decimal version of UID and wait until it's removed to scan again
    if (nfc_initiator_select_passive_target(pnd, nmMifare, NULL, 0, &nt) > 0) {
      print_long(nt.nti.nai.abtUid, nt.nti.nai.szUidLen);
      while (0 == nfc_initiator_target_is_present(pnd, NULL)) {}
      sleep(timeout);
    }
  }
}
